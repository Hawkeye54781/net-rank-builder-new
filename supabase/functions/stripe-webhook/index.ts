import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const clubId = session.client_reference_id || session.metadata?.club_id;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        if (clubId) {
          await admin
            .from("clubs")
            .update({
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              billing_status: "active",
            })
            .eq("id", clubId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const priceId = sub.items?.data?.[0]?.price?.id || null;
        const status = sub.status; // active, past_due, canceled, trialing, etc.
        const clubId = sub.metadata?.club_id;
        // If no metadata, try to find by customer
        let resolveClubId = clubId;
        if (!resolveClubId) {
          const { data: clubs } = await admin
            .from("clubs")
            .select("id")
            .eq("stripe_customer_id", sub.customer)
            .limit(1);
          resolveClubId = clubs?.[0]?.id;
        }
        if (resolveClubId) {
          await admin
            .from("clubs")
            .update({
              stripe_price_id: priceId,
              billing_status: status === "trialing" ? "trialing" : status,
            })
            .eq("id", resolveClubId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const clubId = sub.metadata?.club_id;
        let resolveClubId = clubId;
        if (!resolveClubId) {
          const { data: clubs } = await admin
            .from("clubs")
            .select("id")
            .eq("stripe_customer_id", sub.customer)
            .limit(1);
          resolveClubId = clubs?.[0]?.id;
        }
        if (resolveClubId) {
          await admin
            .from("clubs")
            .update({ billing_status: "canceled" })
            .eq("id", resolveClubId);
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const inv = event.data.object as any;
        const { data: clubs } = await admin
          .from("clubs")
          .select("id")
          .eq("stripe_customer_id", inv.customer)
          .limit(1);
        const clubId = clubs?.[0]?.id;
        if (clubId) {
          await admin
            .from("clubs")
            .update({ billing_status: "active" })
            .eq("id", clubId);
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as any;
        const { data: clubs } = await admin
          .from("clubs")
          .select("id")
          .eq("stripe_customer_id", inv.customer)
          .limit(1);
        const clubId = clubs?.[0]?.id;
        if (clubId) {
          await admin
            .from("clubs")
            .update({ billing_status: "past_due" })
            .eq("id", clubId);
        }
        break;
      }
      default:
        // Ignore other events
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook handling error", e);
    return new Response("Server error", { status: 500 });
  }
});
