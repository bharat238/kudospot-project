import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function for HMAC-SHA256 verification
async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

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
    const expectedSig = await hmacSha256(keySecret, body);

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
