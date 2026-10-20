import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const action = typeof body?.action === "string" ? body.action : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : null;

    if (!token || token.length > 200) return json({ error: "A valid approval token is required." }, 400);
    if (action !== "approve" && action !== "decline" && action !== "reject") {
      return json({ error: "Unsupported approval action." }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const now = new Date().toISOString();

    // New links use approval_tokens, which supports revocation and one-time use.
    const { data: approvalToken, error: tokenError } = await supabaseAdmin
      .from("approval_tokens")
      .select("token,testimonial_id,user_id,used_at,campaign")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) {
      console.error("Approval token lookup failed:", tokenError.message);
      return json({ error: "The approval link could not be checked. Please try again." }, 500);
    }

    if (approvalToken) {
      const { data: testimonial, error: testimonialError } = await supabaseAdmin
        .from("testimonials")
        .select("id,user_id,customer_name,original_text,ai_rewritten_text,status,approval_status,approved_text,campaign")
        .eq("id", approvalToken.testimonial_id)
        .eq("user_id", approvalToken.user_id)
        .maybeSingle();

      if (testimonialError || !testimonial) {
        return json({ error: "This approval link is invalid or no longer available." }, 404);
      }

      const isApprove = action === "approve";
      const alreadyDone = isApprove
        ? testimonial.status === "approved" || testimonial.approval_status === "approved"
        : testimonial.status === "declined" || testimonial.approval_status === "declined";

      if (approvalToken.used_at || alreadyDone) {
        return json({
          success: true,
          already: true,
          action: isApprove ? "approve" : "decline",
          customer_name: testimonial.customer_name,
        });
      }

      // Compare-and-set makes a link one-time-use even if it is opened twice.
      const { data: claimedToken, error: claimError } = await supabaseAdmin
        .from("approval_tokens")
        .update({ used_at: now })
        .eq("token", token)
        .is("used_at", null)
        .select("token")
        .maybeSingle();

      if (claimError || !claimedToken) {
        return json({
          success: true,
          already: true,
          action: isApprove ? "approve" : "decline",
          customer_name: testimonial.customer_name,
        });
      }

      const changes = isApprove
        ? {
            status: "approved",
            approval_status: "approved",
            approved_at: now,
            approved_text: testimonial.ai_rewritten_text || testimonial.original_text,
          }
        : {
            status: "declined",
            approval_status: "declined",
            rejection_reason: reason || null,
            rejected_at: now,
          };

      const { error: updateError } = await supabaseAdmin
        .from("testimonials")
        .update(changes)
        .eq("id", testimonial.id)
        .eq("user_id", approvalToken.user_id);

      if (updateError) {
        // Release the claimed token if the testimonial update failed, allowing a retry.
        await supabaseAdmin.from("approval_tokens").update({ used_at: null }).eq("token", token);
        console.error("Testimonial approval update failed:", updateError.message);
        return json({ error: "Your response could not be saved. Please try again." }, 500);
      }

      const eventType = isApprove ? "approval_approved" : "approval_rejected";
      const { error: eventError } = await supabaseAdmin.from("analytics_events").insert({
        user_id: testimonial.user_id,
        event_type: eventType,
        entity_id: testimonial.id,
        entity_type: "approval",
        campaign: testimonial.campaign || approvalToken.campaign || null,
        metadata: action === "approve" ? {} : { reason },
      });
      if (eventError) console.warn("Approval analytics event could not be recorded:", eventError.message);

      return json({
        success: true,
        already: false,
        action: isApprove ? "approve" : "decline",
        customer_name: testimonial.customer_name,
      });
    }

    // Compatibility for older email links created before approval_tokens existed.
    const { data: legacy, error: legacyError } = await supabaseAdmin
      .from("testimonials")
      .select("id,user_id,customer_name,original_text,ai_rewritten_text,status,approval_status,approved_text,campaign")
      .eq("approval_token", token)
      .maybeSingle();

    if (legacyError || !legacy) {
      return json({ error: "This approval link is invalid or expired. Please contact the business." }, 404);
    }

    const isApprove = action === "approve";
    const alreadyDone = isApprove
      ? legacy.status === "approved" || legacy.approval_status === "approved"
      : legacy.status === "declined" || legacy.approval_status === "declined";

    if (alreadyDone) {
      return json({ success: true, already: true, action: isApprove ? "approve" : "decline", customer_name: legacy.customer_name });
    }

    const legacyChanges = isApprove
      ? {
          status: "approved",
          approval_status: "approved",
          approved_at: now,
          approved_text: legacy.ai_rewritten_text || legacy.original_text,
        }
      : {
          status: "declined",
          approval_status: "declined",
          rejection_reason: reason || null,
          rejected_at: now,
        };

    const { error: legacyUpdateError } = await supabaseAdmin
      .from("testimonials")
      .update(legacyChanges)
      .eq("id", legacy.id);

    if (legacyUpdateError) {
      console.error("Legacy testimonial approval update failed:", legacyUpdateError.message);
      return json({ error: "Your response could not be saved. Please try again." }, 500);
    }

    const { error: legacyEventError } = await supabaseAdmin.from("analytics_events").insert({
      user_id: legacy.user_id,
      event_type: isApprove ? "approval_approved" : "approval_rejected",
      entity_id: legacy.id,
      entity_type: "approval",
      campaign: legacy.campaign || null,
      metadata: action === "approve" ? {} : { reason },
    });
    if (legacyEventError) console.warn("Legacy approval analytics event failed:", legacyEventError.message);

    return json({ success: true, already: false, action: isApprove ? "approve" : "decline", customer_name: legacy.customer_name });
  } catch (error) {
    console.error("handle-approval failed:", error instanceof Error ? error.message : String(error));
    return json({ error: "The approval link could not be processed. Please try again." }, 500);
  }
});
