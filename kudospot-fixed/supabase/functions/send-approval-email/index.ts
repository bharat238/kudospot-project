import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count += 1;
  return false;
}

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return json({ error: "Too many requests. Try again in a minute." }, 429);

  try {
    const body = await req.json().catch(() => ({}));
    const testimonialId = typeof body?.testimonial_id === "string" ? body.testimonial_id.trim() : "";
    if (!testimonialId) return json({ error: "Missing testimonial_id" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error("Approval email function is missing Supabase configuration.");
      return json({ error: "Approval email service is not configured." }, 500);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Sign in before sending an approval request." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Sign in before sending an approval request." }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: testimonial, error: testimonialError } = await admin
      .from("testimonials")
      .select("*")
      .eq("id", testimonialId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (testimonialError) {
      console.error("Failed to load testimonial for approval email:", testimonialError.message);
      return json({ error: "The testimonial could not be loaded." }, 500);
    }
    if (!testimonial) return json({ error: "Testimonial not found in your workspace." }, 404);
    if (!testimonial.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testimonial.customer_email.trim())) {
      return json({ error: "Add a valid customer email before sending an approval request." }, 400);
    }
    if (!testimonial.ai_rewritten_text?.trim()) {
      return json({ error: "Run AI Rewrite before sending the customer approval request." }, 400);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "Email delivery is not configured. Please create a manual approval link instead." }, 503);

    const siteUrl = (Deno.env.get("SITE_URL") || "https://kudospot.pages.dev").replace(/\/+$/, "");
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    // Create the same token type used by manual approval links, so email and copied
    // links both go through the same single-use handler.
    const { data: tokenRow, error: tokenError } = await admin
      .from("approval_tokens")
      .insert({
        testimonial_id: testimonial.id,
        user_id: user.id,
        campaign: testimonial.campaign || null,
      })
      .select("token")
      .single();

    if (tokenError || !tokenRow?.token) {
      console.error("Failed to create approval token:", tokenError?.message || "No token returned");
      return json({ error: "An approval link could not be created." }, 500);
    }

    const token = String(tokenRow.token);
    const approvalUrl = `${siteUrl}/approve/${encodeURIComponent(token)}`;
    const declineUrl = `${siteUrl}/decline/${encodeURIComponent(token)}`;
    const customerName = escapeHtml(testimonial.customer_name || "there");
    const rewrittenText = escapeHtml(testimonial.ai_rewritten_text);
    const subjectName = String(testimonial.customer_name || "there").replace(/[\r\n]+/g, " ").slice(0, 120);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [testimonial.customer_email.trim()],
        subject: `Does this testimonial sound like you, ${subjectName}?`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#171717">
            <h2 style="color:#C94320;margin:0 0 16px">Hi ${customerName},</h2>
            <p style="color:#444;line-height:1.6">A business you worked with would like to share your experience. Please review the edited version below and let us know whether it accurately reflects your experience.</p>
            <div style="background:#fff5ef;border-left:4px solid #C94320;padding:16px;border-radius:8px;margin:24px 0">
              <p style="font-style:italic;color:#333;line-height:1.7;margin:0">“${rewrittenText}”</p>
            </div>
            <p style="margin:24px 0 10px">
              <a href="${approvalUrl}" style="display:inline-block;background:#C94320;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">Yes, this sounds like me</a>
            </p>
            <p style="margin:0 0 24px;color:#666;font-size:13px">Prefer not to publish this testimonial? <a href="${declineUrl}" style="color:#9A3412">Decline this request</a>.</p>
            <p style="color:#777;font-size:12px;line-height:1.6;margin-top:32px">Your testimonial will only be available for public display after you approve it. If something is inaccurate, please contact the business so it can be corrected.</p>
          </div>
        `,
      }),
    });

    const emailData = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok) {
      // A failed delivery must not leave a usable token that looks like a sent request.
      await admin.from("approval_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);
      const providerMessage = typeof emailData?.message === "string" ? emailData.message : "";
      console.error("Approval email delivery failed:", providerMessage || emailResponse.status);
      return json({ error: "Email delivery failed. You can still create and share a manual approval link." }, 502);
    }

    const sentAt = new Date().toISOString();
    const { error: statusError } = await admin.from("testimonials")
      .update({ approval_sent_at: sentAt, approval_status: "sent" })
      .eq("id", testimonial.id)
      .eq("user_id", user.id);

    // Expire earlier unused links after successful delivery so only the newest
    // request remains valid. A cleanup failure does not cancel a delivered email.
    const { error: tokenCleanupError } = await admin.from("approval_tokens")
      .update({ used_at: sentAt })
      .eq("testimonial_id", testimonial.id)
      .eq("user_id", user.id)
      .neq("token", token)
      .is("used_at", null);
    if (tokenCleanupError) console.error("Could not expire older approval links:", tokenCleanupError.message);
    if (statusError) console.error("Email was delivered but testimonial approval status did not update:", statusError.message);

    return json({
      success: true,
      approval_url: approvalUrl,
      message: `Approval email sent to ${testimonial.customer_email.trim()}.`,
      status_updated: !statusError,
    });
  } catch (error) {
    console.error("send-approval-email failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "The approval request could not be sent. Please try again." }, 500);
  }
});
