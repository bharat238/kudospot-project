import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

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

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "Please sign in again to request customer approval." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Approval email service is missing Supabase configuration.");
      return json({ error: "The approval email service is not configured. You can create a manual approval link instead." }, 500);
    }

    // Authenticate the requesting workspace owner before any service-role access.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Your session expired. Please sign in again." }, 401);

    const body = await req.json();
    const testimonialId = typeof body?.testimonial_id === "string" ? body.testimonial_id : "";
    const resend = body?.resend === true;
    if (!testimonialId) return json({ error: "Missing testimonial_id." }, 400);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: testimonial, error: testimonialError } = await supabaseAdmin
      .from("testimonials")
      .select("id,user_id,customer_name,customer_email,ai_rewritten_text,original_text,campaign,approval_status,status")
      .eq("id", testimonialId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (testimonialError) {
      console.error("Could not load the requested testimonial:", testimonialError.message);
      return json({ error: "The testimonial could not be loaded. Please try again." }, 500);
    }
    if (!testimonial) return json({ error: "That testimonial was not found in your workspace." }, 404);
    if (!testimonial.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testimonial.customer_email.trim())) {
      return json({ error: "Add a valid customer email address before sending an approval request." }, 400);
    }

    const testimonialText = testimonial.ai_rewritten_text || testimonial.original_text;
    if (!testimonialText?.trim()) return json({ error: "Add testimonial text before requesting customer approval." }, 400);

    if (resend) {
      const { error: revokeError } = await supabaseAdmin
        .from("approval_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("testimonial_id", testimonial.id)
        .eq("user_id", user.id)
        .is("used_at", null);
      if (revokeError) {
        console.error("Could not invalidate previous approval links:", revokeError.message);
        return json({ error: "The previous approval link could not be replaced. Please try again." }, 500);
      }
    }

    let approvalToken: string | null = null;
    if (!resend) {
      const { data: existingToken, error: existingError } = await supabaseAdmin
        .from("approval_tokens")
        .select("token,approval_text")
        .eq("testimonial_id", testimonial.id)
        .eq("user_id", user.id)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.error("Could not check for an active approval link:", existingError.message);
        return json({ error: "An approval link could not be checked. Please try again." }, 500);
      }
      if (existingToken?.token && existingToken.approval_text === testimonialText) {
        approvalToken = existingToken.token;
      } else if (existingToken?.token) {
        const { error: expireStaleError } = await supabaseAdmin
          .from("approval_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("token", existingToken.token)
          .eq("user_id", user.id)
          .is("used_at", null);
        if (expireStaleError) {
          console.error("Could not revoke approval link for outdated text:", expireStaleError.message);
          return json({ error: "The previous approval link could not be replaced. Please try again." }, 500);
        }
      }
    }

    if (!approvalToken) {
      const { data: insertedToken, error: insertError } = await supabaseAdmin
        .from("approval_tokens")
        .insert({
          testimonial_id: testimonial.id,
          user_id: user.id,
          campaign: testimonial.campaign || null,
          approval_text: testimonialText,
        })
        .select("token")
        .single();

      if (insertError || !insertedToken?.token) {
        console.error("Could not create an approval link:", insertError?.message || "Token missing.");
        return json({ error: "An approval link could not be created. Please try again." }, 500);
      }
      approvalToken = insertedToken.token;
    }

    const siteBase = (Deno.env.get("SITE_URL") || "https://kudospot.pages.dev").replace(/\/+$/, "");
    const approvalUrl = `${siteBase}/approve/${encodeURIComponent(approvalToken)}`;
    const declineUrl = `${siteBase}/decline/${encodeURIComponent(approvalToken)}`;

    // If the mail provider is not configured or rejects delivery, keep the valid
    // link available so the workspace owner can share it manually.
    if (!resendKey) {
      return json({
        success: true,
        email_sent: false,
        approval_url: approvalUrl,
        message: "An approval link was created, but email delivery is not configured. Copy the link and share it with the customer.",
      });
    }

    const customerName = escapeHtml(testimonial.customer_name || "there");
    const safeText = escapeHtml(testimonialText);
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Please review your testimonial</title></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#171717">
  <main style="max-width:560px;margin:32px auto;padding:0 16px">
    <section style="background:#fff;border:1px solid #ebebeb;border-radius:16px;overflow:hidden">
      <header style="padding:24px 28px;border-bottom:1px solid #ebebeb">
        <strong style="font-size:17px;letter-spacing:-.02em">KudoSpot</strong>
      </header>
      <div style="padding:28px">
        <h1 style="font-size:22px;line-height:1.3;letter-spacing:-.03em;margin:0 0 14px">Hi ${customerName},</h1>
        <p style="font-size:14px;line-height:1.7;color:#4d4d4d;margin:0 0 18px">A business you worked with would like to share your experience. Please review the wording below and confirm whether it represents what you meant.</p>
        <blockquote style="margin:0 0 22px;padding:16px 18px;background:#fff5ef;border-left:3px solid #c94320;border-radius:0 10px 10px 0;font-size:14px;line-height:1.7;color:#333">“${safeText}”</blockquote>
        <p style="font-size:13px;line-height:1.6;color:#4d4d4d;margin:0 0 16px">Your testimonial will only be marked approved after you choose to approve it.</p>
        <p style="margin:0 0 12px"><a href="${approvalUrl}" style="display:inline-block;background:#c94320;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9px;font-size:14px;font-weight:600">Approve testimonial</a></p>
        <p style="margin:0"><a href="${declineUrl}" style="color:#555;font-size:13px;text-decoration:underline">Decline testimonial</a></p>
      </div>
      <footer style="padding:16px 28px;background:#fafafa;border-top:1px solid #ebebeb;color:#777;font-size:11px;line-height:1.6">Sent via KudoSpot. If you did not expect this message, you can ignore it.</footer>
    </section>
  </main>
</body>
</html>`;

    let emailResponse: Response;
    let emailData: Record<string, unknown> = {};
    try {
      emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [testimonial.customer_email.trim()],
          subject: "Please review your testimonial",
          html,
        }),
      });
      emailData = await emailResponse.json().catch(() => ({}));
    } catch (error) {
      console.error("Approval email delivery request failed:", error instanceof Error ? error.message : String(error));
      return json({
        success: true,
        email_sent: false,
        approval_url: approvalUrl,
        message: "An approval link was created, but the email service could not be reached. Copy the link and share it with the customer.",
      });
    }

    if (!emailResponse.ok) {
      console.error("Approval email provider returned an error:", JSON.stringify(emailData).slice(0, 400));
      return json({
        success: true,
        email_sent: false,
        approval_url: approvalUrl,
        message: "An approval link was created, but the email could not be delivered. Copy the link and share it with the customer.",
      });
    }

    const sentAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("testimonials")
      .update({ approval_sent_at: sentAt, approval_status: "sent" })
      .eq("id", testimonial.id)
      .eq("user_id", user.id);

    if (updateError) console.warn("Approval status could not be updated:", updateError.message);

    return json({
      success: true,
      email_sent: true,
      approval_url: approvalUrl,
      message: "Approval email sent to " + testimonial.customer_email.trim() + ".",
    });
  } catch (error) {
    console.error("send-approval-email failed:", error instanceof Error ? error.message : String(error));
    return json({ error: "The approval request could not be prepared. Please try again." }, 500);
  }
});
