import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      // Update local DB
      await supabaseClient.from("subscriptions").upsert({
        user_id: user.id,
        subscription_status: "inactive",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_end: null,
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ subscribed: false, status: "inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    let status = "inactive";
    let subscriptionEnd = null;
    let stripeSubId = null;

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];
      stripeSubId = sub.id;
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();

      if (sub.status === "active" || sub.status === "trialing") {
        status = "active";
      } else if (sub.status === "past_due") {
        status = "past_due";
      } else if (sub.status === "canceled" || sub.status === "unpaid") {
        status = "canceled";
      } else {
        status = "inactive";
      }
    }

    // Sync to local DB
    await supabaseClient.from("subscriptions").upsert({
      user_id: user.id,
      subscription_status: status,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubId,
      current_period_end: subscriptionEnd,
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({
      subscribed: status === "active",
      status,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
