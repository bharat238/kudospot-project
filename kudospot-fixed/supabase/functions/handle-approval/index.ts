import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, action, text, reason } = await req.json();

    // 1. Find testimonial by token
    const { data: t, error: tErr } = await supabaseAdmin
      .from("testimonials")
      .select("*")
      .eq("approval_token", token)
      .maybeSingle();

    if (tErr || !t) {
      return new Response(JSON.stringify({ error: "Invalid token or testimonial not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Update status
    const now = new Date().toISOString();
    if (action === "approve") {
      await supabaseAdmin
        .from("testimonials")
        .update({ approved_text: text || t.ai_rewritten_text, status: "approved", approved_at: now })
        .eq("id", t.id);

      // Log analytics event
      await supabaseAdmin.from("analytics_events").insert({
        user_id: t.user_id,
        event_type: "approval_approved",
        entity_id: t.id,
        entity_type: "approval",
        campaign: t.campaign,
      });
    } else if (action === "reject" || action === "decline") {
      await supabaseAdmin
        .from("testimonials")
        .update({ status: "declined", rejection_reason: reason, rejected_at: now })
        .eq("id", t.id);

      await supabaseAdmin.from("analytics_events").insert({
        user_id: t.user_id,
        event_type: "approval_rejected",
        entity_id: t.id,
        entity_type: "approval",
        campaign: t.campaign,
        metadata: { reason },
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("handle-approval error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
