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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Approval service is not configured." }, 500);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const action = typeof body?.action === "string" ? body.action : "";
    const requestedText = typeof body?.text === "string" ? body.text.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";

    if (!token) return json({ error: "Missing approval token." }, 400);
    if (action !== "approve" && action !== "decline" && action !== "reject") {
      return json({ error: "Unsupported approval action." }, 400);
    }

    const admin = createClient(url, serviceKey);
    const { data: tokenRow, error: tokenError } = await admin
      .from("approval_tokens")
      .select("token,testimonial_id,user_id,used_at")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) {
      console.error("Approval token lookup failed:", tokenError.message);
      return json({ error: "The approval link could not be verified." }, 500);
    }

    let testimonial: any = null;
    let usesManagedToken = Boolean(tokenRow);

    if (tokenRow) {
      const { data, error } = await admin
        .from("testimonials")
        .select("id,user_id,customer_name,original_text,ai_rewritten_text,approved_text,status,approval_status,approval_token,campaign")
        .eq("id", tokenRow.testimonial_id)
        .eq("user_id", tokenRow.user_id)
        .maybeSingle();
      if (error) {
        console.error("Approval testimonial lookup failed:", error.message);
        return json({ error: "The testimonial could not be loaded." }, 500);
      }
      testimonial = data;
    } else {
      // Compatibility for approval emails sent before approval_tokens became the
      // canonical token store. Legacy tokens are rotated after the first response.
      const { data, error } = await admin
        .from("testimonials")
        .select("id,user_id,customer_name,original_text,ai_rewritten_text,approved_text,status,approval_status,approval_token,campaign")
        .eq("approval_token", token)
        .maybeSingle();
      if (error) {
        console.error("Legacy approval token lookup failed:", error.message);
        return json({ error: "The approval link could not be verified." }, 500);
      }
      testimonial = data;
      usesManagedToken = false;
    }

    if (!testimonial) return json({ error: "This approval link is invalid or expired." }, 404);

    const hasResponded = testimonial.approval_status === "approved" ||
      testimonial.approval_status === "declined" ||
      testimonial.status === "approved" ||
      testimonial.status === "published" ||
      testimonial.status === "declined";

    if (tokenRow?.used_at) {
      if (hasResponded) {
        return json({ success: true, already: true, declined: testimonial.status === "declined", name: testimonial.customer_name });
      }
      return json({ error: "This approval link has expired. Ask the business to send a new one." }, 410);
    }

    if (hasResponded) {
      return json({ success: true, already: true, declined: testimonial.status === "declined", name: testimonial.customer_name });
    }

    const now = new Date().toISOString();
    const approved = action === "approve";
    const update = approved
      ? {
          status: "approved",
          approval_status: "approved",
          approved_text: requestedText || testimonial.ai_rewritten_text || testimonial.original_text,
          approved_at: now,
          rejection_reason: null,
          rejected_at: null,
          ...(!usesManagedToken ? { approval_token: crypto.randomUUID() } : {}),
        }
      : {
          status: "declined",
          approval_status: "declined",
          rejection_reason: reason || null,
          rejected_at: now,
          ...(!usesManagedToken ? { approval_token: crypto.randomUUID() } : {}),
        };

    const { error: updateError } = await admin
      .from("testimonials")
      .update(update)
      .eq("id", testimonial.id)
      .eq("user_id", testimonial.user_id);
    if (updateError) {
      console.error("Approval response could not be saved:", updateError.message);
      return json({ error: "Your response could not be saved. Please try again." }, 500);
    }

    if (usesManagedToken && tokenRow) {
      const { error: markUsedError } = await admin.from("approval_tokens")
        .update({ used_at: now })
        .eq("token", token)
        .is("used_at", null);
      if (markUsedError) console.error("Could not mark approval token as used:", markUsedError.message);
    }

    // Analytics are helpful, but a telemetry failure must not undo the customer's response.
    const { error: analyticsError } = await admin.from("analytics_events").insert({
      user_id: testimonial.user_id,
      event_type: approved ? "approval_approved" : "approval_rejected",
      entity_id: testimonial.id,
      entity_type: "approval",
      campaign: testimonial.campaign || null,
      metadata: approved ? {} : { reason: reason || null },
    });
    if (analyticsError) console.error("Approval analytics event failed:", analyticsError.message);

    return json({
      success: true,
      already: false,
      declined: !approved,
      name: testimonial.customer_name,
    });
  } catch (error) {
    console.error("handle-approval failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "We couldn't process this approval link. Please try again." }, 500);
  }
});
