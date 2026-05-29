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

    // 1. Validate token
    const { data: tk, error: tkErr } = await supabaseAdmin
      .from("approval_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (tkErr || !tk) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (tk.used_at) {
      return new Response(JSON.stringify({ error: "Token already used" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Fetch testimonial
    const { data: t, error: tErr } = await supabaseAdmin
      .from("testimonials")
      .select("*")
      .eq("id", tk.testimonial_id)
      .maybeSingle();

    if (tErr || !t) {
      return new Response(JSON.stringify({ error: "Testimonial not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Update status
    const now = new Date().toISOString();
    if (action === "approve") {
      await supabaseAdmin
        .from("testimonials")
        .update({ approved_text: text, status: "approved", approved_at: now })
        .eq("id", t.id);

      // BUG 3 Fix: Insert analytics event
      await supabaseAdmin.from("analytics_events").insert({
        user_id: tk.user_id,
        event_type: "approval_approved",
        entity_id: t.id,
        entity_type: "approval",
        campaign: tk.campaign,
      });
    } else {
      await supabaseAdmin
        .from("testimonials")
        .update({ status: "rejected", rejection_reason: reason, rejected_at: now })
        .eq("id", t.id);

      await supabaseAdmin.from("analytics_events").insert({
        user_id: tk.user_id,
        event_type: "approval_rejected",
        entity_id: t.id,
        entity_type: "approval",
        campaign: tk.campaign,
        metadata: { reason },
      });
    }

    // 4. Mark token as used
    await supabaseAdmin
      .from("approval_tokens")
      .update({ used_at: now })
      .eq("token", token);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("handle-approval error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
