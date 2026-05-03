import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_AMOUNTS: Record<string, number> = {
  starter: 49900,  // ₹499 in paise
  pro: 129900,     // ₹1299 in paise
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { plan } = await req.json();
    const amount = PLAN_AMOUNTS[plan];
    if (!amount) return new Response(JSON.stringify({ error: "Invalid plan. Use starter or pro." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Razorpay keys not configured in Supabase secrets." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const credentials = btoa(`${keyId}:${keySecret}`);
    const receipt = `pe_${user.id.slice(0, 8)}_${Date.now()}`;

    const rzResp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency: "INR", receipt }),
    });

    if (!rzResp.ok) {
      const err = await rzResp.text();
      console.error("Razorpay order error", rzResp.status, err);
      return new Response(JSON.stringify({ error: "Failed to create Razorpay order" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const order = await rzResp.json();
    return new Response(JSON.stringify({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      plan,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("create-razorpay-order error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
