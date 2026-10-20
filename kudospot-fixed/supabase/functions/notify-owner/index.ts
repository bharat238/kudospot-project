import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (isRateLimited(ip)) return json({ error: "Too many requests. Try again in a minute." }, 429);

  try {
    const body = await req.json();
    const formId = typeof body?.form_id === "string" ? body.form_id : "";
    const testimonialId = typeof body?.testimonial_id === "string" ? body.testimonial_id : "";
    if (!formId || !testimonialId) return json({ error: "Missing form or testimonial reference." }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Never trust the owner's email, customer name, snippet, or form name from an anonymous caller.
    const { data: form, error: formError } = await supabaseAdmin
      .from("collection_forms")
      .select("id,user_id,form_name,is_active")
      .eq("id", formId)
      .eq("is_active", true)
      .maybeSingle();

    if (formError) {
      console.error("notify-owner form lookup failed:", formError.message);
      return json({ error: "The collection form could not be validated." }, 500);
    }
    if (!form) return json({ error: "The collection form is inactive or no longer available." }, 404);

    const { data: testimonial, error: testimonialError } = await supabaseAdmin
      .from("testimonials")
      .select("id,user_id,source,customer_name,original_text,owner_notification_sent_at")
      .eq("id", testimonialId)
      .eq("user_id", form.user_id)
      .eq("source", "form")
      .maybeSingle();

    if (testimonialError) {
      console.error("notify-owner testimonial lookup failed:", testimonialError.message);
      return json({ error: "The testimonial could not be validated." }, 500);
    }
    if (!testimonial) return json({ error: "No matching testimonial submission was found." }, 404);
    if (testimonial.owner_notification_sent_at) {
      return json({ success: true, duplicate: true, email_sent: true });
    }

    const claimedAt = new Date().toISOString();
    const { data: claim, error: claimError } = await supabaseAdmin
      .from("testimonials")
      .update({ owner_notification_sent_at: claimedAt })
      .eq("id", testimonial.id)
      .eq("user_id", form.user_id)
      .is("owner_notification_sent_at", null)
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("notify-owner claim failed:", claimError.message);
      return json({ error: "The notification status could not be checked." }, 500);
    }
    if (!claim) return json({ success: true, duplicate: true, email_sent: true });

    const releaseClaim = async () => {
      const { error } = await supabaseAdmin
        .from("testimonials")
        .update({ owner_notification_sent_at: null })
        .eq("id", testimonial.id)
        .eq("user_id", form.user_id)
        .eq("owner_notification_sent_at", claimedAt);
      if (error) console.warn("notify-owner claim release failed:", error.message);
    };

    const { data: { user: owner }, error: ownerError } = await supabaseAdmin.auth.admin.getUserById(form.user_id);
    if (ownerError || !owner?.email) {
      await releaseClaim();
      return json({ error: "The business owner could not be reached." }, 404);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      await releaseClaim();
      console.log("[notify-owner] Email is not configured; notification is ready to retry.");
      return json({ success: true, email_sent: false, message: "Email notification is not configured." });
    }

    const siteUrl = (Deno.env.get("SITE_URL") || "https://kudospot.pages.dev").replace(/\/+$/, "");
    const customerName = testimonial.customer_name || "A customer";
    const safeCustomerName = escapeHtml(customerName);
    const safeFormName = escapeHtml(form.form_name || "KudoSpot collection form");
    const snippet = String(testimonial.original_text || "").slice(0, 200);
    const safeSnippet = escapeHtml(snippet);
    const safeSubjectName = customerName.replace(/[\r\n]+/g, " ").slice(0, 120);

    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>New testimonial received</title></head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f7f7;margin:0;padding:0;color:#171717">
  <main style="max-width:560px;margin:32px auto;padding:0 16px">
    <section style="background:#fff;border:1px solid #ebebeb;border-radius:16px;overflow:hidden">
      <header style="background:#c94320;padding:20px 28px;color:#fff;font-size:17px;font-weight:700">KudoSpot</header>
      <div style="padding:28px">
        <h1 style="font-size:21px;line-height:1.3;margin:0 0 14px">New testimonial received</h1>
        <p style="font-size:14px;line-height:1.7;color:#4d4d4d;margin:0 0 16px"><strong>${safeCustomerName}</strong> submitted a testimonial through <strong>${safeFormName}</strong>.</p>
        ${safeSnippet ? `<blockquote style="margin:0 0 22px;padding:16px 18px;background:#fff5ef;border-left:3px solid #c94320;border-radius:0 10px 10px 0;font-size:14px;line-height:1.7;color:#333">“${safeSnippet}${String(testimonial.original_text || "").length > 200 ? "…" : ""}”</blockquote>` : ""}
        <p style="margin:0"><a href="${siteUrl}/testimonials" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9px;font-size:14px;font-weight:600">Review testimonial</a></p>
      </div>
      <footer style="padding:16px 28px;background:#fafafa;border-top:1px solid #ebebeb;color:#777;font-size:11px">Sent via KudoSpot</footer>
    </section>
  </main>
</body>
</html>`;

    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "KudoSpot <onboarding@resend.dev>",
          to: [owner.email],
          subject: `New testimonial from ${safeSubjectName}`,
          html,
        }),
      });
    } catch (error) {
      await releaseClaim();
      console.error("Owner notification delivery failed:", error instanceof Error ? error.message : String(error));
      return json({ error: "The notification could not be delivered." }, 502);
    }

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      await releaseClaim();
      console.error("Resend rejected owner notification:", response.status, details.slice(0, 300));
      return json({ error: "The notification could not be delivered." }, 502);
    }

    return json({ success: true, email_sent: true });
  } catch (error) {
    console.error("notify-owner failed:", error instanceof Error ? error.message : String(error));
    return json({ error: "The notification could not be sent." }, 500);
  }
});
