import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_BASIC_EUR = Deno.env.get("STRIPE_PRICE_BASIC_EUR")!; // e.g., price_123 for €15
const STRIPE_PRICE_PLUS_EUR = Deno.env.get("STRIPE_PRICE_PLUS_EUR")!;  // e.g., price_456 for €25
const SITE_URL = Deno.env.get("SITE_URL")!; // e.g., https://your-app.com
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const { clubId } = await req.json().catch(() => ({ clubId: null }));
    if (!clubId) return new Response(JSON.stringify({ error: "clubId required" }), { status: 400 });

    // Auth client to get the caller user
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

    // Admin client for privileged reads/writes
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin rights
    const { data: isAdmin, error: adminErr } = await admin.rpc("is_club_admin", {
      _user_id: userData.user.id,
      _club_id: clubId,
    });
    if (adminErr || !isAdmin) return new Response("Forbidden", { status: 403 });

    // Fetch club
    const { data: club, error: clubErr } = await admin
      .from("clubs")
      .select("id, name, plan_tier, stripe_customer_id, trial_end_at, billing_status")
      .eq("id", clubId)
      .single();
    if (clubErr || !club) return new Response("Club not found", { status: 404 });

    // Fetch profile for email/name (to create customer if needed)
    const { data: profile } = await admin
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", userData.user.id)
      .single();

    // Ensure Stripe customer
    let customerId = club.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? userData.user.email ?? undefined,
        name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : undefined,
        metadata: { club_id: club.id },
      });
      customerId = customer.id;
      await admin.from("clubs").update({ stripe_customer_id: customerId }).eq("id", club.id);
    }

    const priceId = club.plan_tier === "plus" ? STRIPE_PRICE_PLUS_EUR : STRIPE_PRICE_BASIC_EUR;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: club.id,
      metadata: { club_id: club.id },
      subscription_data: { metadata: { club_id: club.id } },
      success_url: `${SITE_URL}/billing?club=${club.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/billing?club=${club.id}&canceled=1`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-checkout error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
