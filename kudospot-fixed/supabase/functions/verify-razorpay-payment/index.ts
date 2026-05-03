import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json();

    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) return new Response(JSON.stringify({ error: "Razorpay secret not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = hmac("sha256", keySecret, body, "utf8", "hex");

    if (expectedSig !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Payment verification failed. Signature mismatch." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Signature valid — update plan
    const { error: updateErr } = await supabase.from("profiles").update({
      plan,
      razorpay_customer_id: razorpay_payment_id,
    }).eq("id", user.id);

    if (updateErr) return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, plan }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("verify-razorpay-payment error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
