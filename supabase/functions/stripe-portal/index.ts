import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const { clubId } = await req.json().catch(() => ({ clubId: null }));
    if (!clubId) return new Response(JSON.stringify({ error: "clubId required" }), { status: 400 });

    // Auth user
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin
    const { data: isAdmin } = await admin.rpc("is_club_admin", {
      _user_id: userData.user.id,
      _club_id: clubId,
    });
    if (!isAdmin) return new Response("Forbidden", { status: 403 });

    const { data: club } = await admin
      .from("clubs")
      .select("id, stripe_customer_id")
      .eq("id", clubId)
      .single();
    if (!club) return new Response("Club not found", { status: 404 });

    if (!club.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "Missing customer" }), { status: 400 });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: club.stripe_customer_id,
      return_url: `${SITE_URL}/billing?club=${club.id}`,
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-portal error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
