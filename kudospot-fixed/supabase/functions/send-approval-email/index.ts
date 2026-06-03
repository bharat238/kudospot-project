import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiter — resets on cold start, good enough for edge
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

Deno.serve(async (req) => {
  console.log("STEP 1: Function handler called");
  console.log("Method:", req.method);

  if (req.method === "OPTIONS") {
    console.log("STEP 2: OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting — must be before any other processing
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Try again in a minute." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    console.log("STEP 3: Parsing request body");
    const body = await req.json();
    console.log("STEP 4: Body received:", JSON.stringify(body));

    const { testimonial_id } = body;
    if (!testimonial_id) {
      console.log("STEP 5: No testimonial_id");
      return new Response(
        JSON.stringify({ error: "Missing testimonial_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    console.log("STEP 6: Connecting to Supabase");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("STEP 7: Fetching testimonial");
    const { data: testimonial, error: tErr } = await supabase
      .from("testimonials")
      .select("*")
      .eq("id", testimonial_id)
      .maybeSingle();

    console.log("STEP 8: Testimonial result:", JSON.stringify(testimonial), "Error:", JSON.stringify(tErr));

    if (!testimonial) {
      return new Response(
        JSON.stringify({ error: "Testimonial not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    console.log("STEP 9: Sending email via Resend");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    console.log("STEP 10: Resend key exists:", !!resendKey);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: "mrbharat.238@gmail.com",
        subject: `Does this sound like you, ${testimonial.customer_name}?`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;">
            <h2 style="color:#7C3AED;">Hi ${testimonial.customer_name},</h2>
            <p style="color:#444;">A business you worked with would love to
            share your experience. Here is the polished version —
            does it sound like you?</p>
            <div style="background:#f9f5ff;border-left:4px solid #7C3AED;
            padding:16px;border-radius:8px;margin:24px 0;">
              <p style="font-style:italic;color:#333;line-height:1.6;">
              "${testimonial.ai_rewritten_text}"</p>
            </div>
            <a href="${Deno.env.get('SITE_URL')}/approve/${testimonial.approval_token}"
            style="display:inline-block;background:#7C3AED;color:white;
            padding:14px 32px;border-radius:8px;text-decoration:none;
            font-weight:bold;font-size:16px;">✓ Yes, approve this</a>
            <p style="color:#999;font-size:12px;margin-top:32px;">
            If this does not sound right, simply reply to this email.</p>
          </div>
        `
      })
    });

    const emailData = await emailRes.json();
    console.log("STEP 11: Email result:", JSON.stringify(emailData));

    if (!emailRes.ok) {
      return new Response(
        JSON.stringify({ error: "Email failed", details: emailData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    console.log("STEP 12: Updating testimonial status");
    await supabase.from("testimonials").update({
      approval_sent_at: new Date().toISOString(),
      approval_status: "sent"
    }).eq("id", testimonial_id);

    console.log("STEP 13: Done!");
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );

  } catch(e) {
    console.error("CATCH ERROR:", e instanceof Error ? e.message : String(e));
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );
  }
});
