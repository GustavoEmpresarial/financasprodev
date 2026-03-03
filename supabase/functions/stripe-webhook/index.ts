import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Fallback for development without webhook secret
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log(`[WEBHOOK] Event: ${event.type}`);

    const relevantEvents = [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
    ];

    if (relevantEvents.includes(event.type)) {
      let customerId: string | null = null;
      let status = "inactive";
      let stripeSubId: string | null = null;
      let periodEnd: string | null = null;

      if (event.type.startsWith("customer.subscription")) {
        const sub = event.data.object as Stripe.Subscription;
        customerId = sub.customer as string;
        stripeSubId = sub.id;
        periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        if (sub.status === "active" || sub.status === "trialing") {
          status = "active";
        } else if (sub.status === "past_due") {
          status = "past_due";
        } else {
          status = "canceled";
        }
      } else if (event.type.startsWith("invoice.")) {
        const invoice = event.data.object as Stripe.Invoice;
        customerId = invoice.customer as string;
        stripeSubId = invoice.subscription as string | null;

        if (event.type === "invoice.payment_succeeded") {
          status = "active";
        } else {
          status = "past_due";
        }

        if (stripeSubId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubId);
          periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }
      }

      if (customerId) {
        // Look up user by stripe customer email
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted && customer.email) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const matchedUser = users?.users?.find(u => u.email === customer.email);

          if (matchedUser) {
            await supabase.from("subscriptions").upsert({
              user_id: matchedUser.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: stripeSubId,
              subscription_status: status,
              current_period_end: periodEnd,
            }, { onConflict: "user_id" });
            console.log(`[WEBHOOK] Updated subscription for user ${matchedUser.id}: ${status}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
