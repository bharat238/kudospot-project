import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { user_id, customer_name, testimonial_snippet, form_name } = await req.json();
    if (!user_id || !customer_name) {
      return new Response(JSON.stringify({ error: "user_id and customer_name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user: ownerUser }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (userErr || !ownerUser?.email) {
      return new Response(JSON.stringify({ error: "Owner not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabaseAdmin.from("profiles").select("business_name").eq("id", user_id).maybeSingle();
    const businessName = profile?.business_name || "your business";
    const siteUrl = Deno.env.get("SITE_URL") || "https://kudospot.pages.dev";

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.log(`[notify-owner] No RESEND_API_KEY. Would notify ${ownerUser.email} about ${customer_name}`);
      return new Response(JSON.stringify({ success: true, message: "Notification skipped — email not configured" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const snippet = testimonial_snippet ? testimonial_snippet.slice(0, 200) : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8f8f8;margin:0;padding:0"><div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)\"><div style="background:#7C3AED;padding:20px 28px\"><div style="color:#fff;font-size:18px;font-weight:700\">KudoSpot</div></div><div style="padding:28px\"><p style=\"margin:0 0 12px;font-size:16px;font-weight:600;color:#111\">New testimonial received! 🎉</p><p style=\"margin:0 0 20px;font-size:14px;color:#555;line-height:1.6\"><strong>${customer_name}</strong> just submitted a testimonial via your <strong>${form_name || "KudoSpot"}</strong> form.</p>${snippet ? `<div style=\"background:#f3f0ff;border-left:4px solid #7C3AED;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 20px\"><p style=\"margin:0;font-size:13px;color:#444;font-style:italic\">&ldquo;${snippet}${testimonial_snippet.length > 200 ? "…" : ""}&rdquo;</p></div>` : ""}<a href=\"${siteUrl}/testimonials\" style=\"display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600\">View &amp; Rewrite →</a></div><div style=\"background:#f8f8f8;padding:14px 28px;border-top:1px solid #eee\"><p style=\"margin:0;font-size:11px;color:#aaa\">KudoSpot — kudospot.pages.dev</p></div></div></body></html>`;

    const emailResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "KudoSpot <onboarding@resend.dev>",
        to: [ownerUser.email],
        subject: `New testimonial from ${customer_name} 🎉`,
        html,
      }),
    });

    if (!emailResp.ok) {
      const errText = await emailResp.text();
      console.error("Resend error", emailResp.status, errText);
      return new Response(JSON.stringify({ success: false, message: "Email failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("notify-owner error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
