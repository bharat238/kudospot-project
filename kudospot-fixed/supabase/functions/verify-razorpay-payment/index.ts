import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const PLAN_AMOUNTS: Record<string, number> = {
  starter: 49900,
  pro: 129900,
};

const ACCESS_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "Please sign in again to verify the payment." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !keyId || !keySecret) {
      console.error("Payment verification is missing required server configuration.");
      return json({ error: "Payment verification is not configured. Contact support before retrying payment." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Your session expired. Please sign in again." }, 401);

    const body = await req.json();
    const orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";
    const plan = typeof body?.plan === "string" ? body.plan : "";
    const expectedAmount = PLAN_AMOUNTS[plan];

    if (!orderId || !paymentId || !signature || !expectedAmount) {
      return json({ error: "The payment response is incomplete or the selected plan is invalid." }, 400);
    }

    const expectedSignature = await hmacSha256(keySecret, `${orderId}|${paymentId}`);
    if (!constantTimeEqual(expectedSignature, signature.toLowerCase())) {
      return json({ error: "Payment signature verification failed." }, 400);
    }

    const credentials = btoa(`${keyId}:${keySecret}`);
    const apiHeaders = { Authorization: `Basic ${credentials}` };

    // Trust the server-side Razorpay order, not plan/amount values sent by the browser.
    const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: apiHeaders,
    });
    if (!orderResponse.ok) {
      console.error("Could not verify Razorpay order:", orderResponse.status);
      return json({ error: "The payment order could not be verified. Please contact support before trying again." }, 400);
    }
    const order = await orderResponse.json();

    if (
      order.id !== orderId ||
      Number(order.amount) !== expectedAmount ||
      order.currency !== "INR" ||
      order.status !== "paid" ||
      order.notes?.user_id !== user.id ||
      order.notes?.plan !== plan ||
      order.notes?.purpose !== "kudospot-plan-upgrade"
    ) {
      return json({ error: "The payment does not match this account and plan. Your plan was not changed." }, 400);
    }

    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: apiHeaders,
    });
    if (!paymentResponse.ok) {
      console.error("Could not verify Razorpay payment:", paymentResponse.status);
      return json({ error: "The payment could not be verified. Please contact support before retrying." }, 400);
    }
    const payment = await paymentResponse.json();

    if (
      payment.id !== paymentId ||
      payment.order_id !== orderId ||
      Number(payment.amount) !== expectedAmount ||
      payment.currency !== "INR" ||
      payment.status !== "captured" ||
      payment.captured !== true
    ) {
      return json({ error: "This payment has not been captured for the selected plan." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Idempotency: a valid signed payment can grant access only once.
    const { data: existingPayment, error: existingError } = await admin
      .from("billing_payments")
      .select("order_id,payment_id,user_id,plan,expires_at")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingError) {
      console.error("Payment idempotency lookup failed:", existingError.message);
      return json({ error: "Payment status could not be checked. Please try again." }, 500);
    }

    if (existingPayment) {
      if (existingPayment.user_id !== user.id || existingPayment.payment_id !== paymentId || existingPayment.plan !== plan) {
        return json({ error: "This payment has already been applied to a different request." }, 409);
      }
      return json({
        success: true,
        already_processed: true,
        plan: existingPayment.plan,
        expires_at: existingPayment.expires_at,
        renewal_required: true,
      });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("plan_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Could not load plan expiry:", profileError?.message || "Profile missing.");
      return json({ error: "Your account could not be updated. Contact support with your payment receipt." }, 500);
    }

    const now = Date.now();
    const priorExpiry = profile.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : 0;
    const expiresAt = new Date(Math.max(now, Number.isFinite(priorExpiry) ? priorExpiry : 0) + ACCESS_PERIOD_MS).toISOString();

    const { error: paymentInsertError } = await admin.from("billing_payments").insert({
      order_id: orderId,
      payment_id: paymentId,
      user_id: user.id,
      plan,
      amount: expectedAmount,
      currency: "INR",
      expires_at: expiresAt,
    });

    if (paymentInsertError) {
      // Another request may have verified the same payment between the lookup and insert.
      if (paymentInsertError.code === "23505") {
        const { data: racedPayment } = await admin
          .from("billing_payments")
          .select("order_id,payment_id,user_id,plan,expires_at")
          .eq("order_id", orderId)
          .maybeSingle();
        if (racedPayment?.user_id === user.id && racedPayment.payment_id === paymentId && racedPayment.plan === plan) {
          return json({ success: true, already_processed: true, plan, expires_at: racedPayment.expires_at, renewal_required: true });
        }
        return json({ error: "This payment has already been processed." }, 409);
      }
      console.error("Could not record verified payment:", paymentInsertError.message);
      return json({ error: "The verified payment could not be recorded. Contact support before retrying." }, 500);
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update({ plan, plan_expires_at: expiresAt })
      .eq("id", user.id);

    if (updateError) {
      await admin.from("billing_payments").delete().eq("order_id", orderId).eq("user_id", user.id);
      console.error("Could not update plan after verified payment:", updateError.message);
      return json({ error: "Payment was verified, but the account could not be updated. Contact support with your payment receipt." }, 500);
    }

    return json({
      success: true,
      already_processed: false,
      plan,
      expires_at: expiresAt,
      renewal_required: true,
    });
  } catch (error) {
    console.error("verify-razorpay-payment failed:", error instanceof Error ? error.message : String(error));
    return json({ error: "Payment verification failed. Contact support before trying again." }, 500);
  }
});
