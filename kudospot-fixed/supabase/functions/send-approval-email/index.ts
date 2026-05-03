import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const { testimonial_id } = await req.json();
    if (!testimonial_id) return new Response(JSON.stringify({ error: "testimonial_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: t } = await supabase.from("testimonials").select("*").eq("id", testimonial_id).eq("user_id", user.id).maybeSingle();
    if (!t) return new Response(JSON.stringify({ error: "Testimonial not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (!t.customer_email) return new Response(JSON.stringify({ error: "No customer email on this testimonial. Edit the testimonial and add their email first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (!t.ai_rewritten_text) return new Response(JSON.stringify({ error: "Run AI Rewrite first before sending the approval email." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: profile } = await supabase.from("profiles").select("business_name, full_name").eq("id", user.id).maybeSingle();
    const businessName = profile?.business_name || "us";
    const senderName = profile?.full_name || "The team";

    // Create approval token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("approval_tokens")
      .insert({ testimonial_id: t.id, user_id: user.id, campaign: t.campaign || null })
      .select("token")
      .single();

    if (tokenErr || !tokenRow) return new Response(JSON.stringify({ error: "Failed to create approval token" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const siteUrl = Deno.env.get("SITE_URL") || "https://kudospot.vercel.app";
    const approvalUrl = `${siteUrl}/approve/${tokenRow.token}`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      // Fallback: just return the approval URL so user can share manually
      return new Response(JSON.stringify({
        success: true,
        message: "Approval link created (email not sent — RESEND_API_KEY not configured)",
        approval_url: approvalUrl,
        token: tokenRow.token,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:#7C3AED;padding:24px 32px">
      <div style="color:#ffffff;font-size:20px;font-weight:700">KudoSpot</div>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:16px;color:#111">Hi ${t.customer_name},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6">
        Thank you for being a customer of <strong>${businessName}</strong>. We'd love to share your experience with others — it only takes 30 seconds to review and approve.
      </p>
      <div style="background:#f3f0ff;border-left:4px solid #7C3AED;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 24px">
        <p style="margin:0;font-size:14px;color:#333;line-height:1.7;font-style:italic">"${t.ai_rewritten_text}"</p>
      </div>
      <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6">
        Does this sound right to you? Click below to review, edit if needed, and approve — or decline if you prefer.
      </p>
      <a href="${approvalUrl}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">
        Review &amp; Approve →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.6">
        This link is unique to you. You can edit the text, approve the original, or decline entirely.
      </p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee">
      <p style="margin:0;font-size:12px;color:#aaa">Sent by ${senderName} via KudoSpot</p>
    </div>
  </div>
</body>
</html>`;

    const emailResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${businessName} via KudoSpot <onboarding@resend.dev>`,
        to: [t.customer_email],
        subject: `Quick question about your experience with ${businessName}`,
        html: emailHtml,
      }),
    });

    if (!emailResp.ok) {
      const errText = await emailResp.text();
      console.error("Resend error", emailResp.status, errText);
      // Return partial success — token was created, email failed
      return new Response(JSON.stringify({
        success: true,
        message: "Approval link created but email send failed. Copy the link and send manually.",
        approval_url: approvalUrl,
        email_error: errText,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Track in email_sends
    await supabase.from("email_sends").insert({
      user_id: user.id,
      customer_email: t.customer_email,
      customer_name: t.customer_name,
      status: "sent",
      campaign: t.campaign || null,
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Approval email sent to ${t.customer_email}`,
      approval_url: approvalUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("send-approval-email error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
