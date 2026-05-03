import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Spread N events evenly between `from` and `to` (inclusive), returning ISO strings.
function spread(from: Date, to: Date, n: number): string[] {
  if (n <= 0) return [];
  const start = from.getTime();
  const end = Math.max(to.getTime(), start + 1);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = start + ((end - start) * (i + 0.5)) / n;
    // small jitter so events don't all land on the same hour
    const jitter = (Math.random() - 0.5) * 1000 * 60 * 60;
    out.push(new Date(t + jitter).toISOString());
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const now = new Date();
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "1";
    const force = url.searchParams.get("force") === "1";

    // Skip if backfill already ran (unless forced)
    const { count: existing } = await admin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", "backfill");

    if ((existing || 0) > 0 && !force && !dryRun) {
      return new Response(JSON.stringify({ ok: true, skipped: true, message: "Backfill already ran" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const events: any[] = [];

    // 1. Widgets — synthesize widget_view + widget_click between created_at and now
    const { data: widgets } = await admin
      .from("widgets")
      .select("id, user_id, views, clicks, created_at, campaign")
      .eq("user_id", userId);

    for (const w of widgets || []) {
      const from = new Date(w.created_at || now);
      for (const t of spread(from, now, w.views || 0)) {
        events.push({
          user_id: userId, event_type: "widget_view", entity_id: w.id, entity_type: "widget",
          source: "backfill", campaign: w.campaign, created_at: t,
        });
      }
      for (const t of spread(from, now, w.clicks || 0)) {
        events.push({
          user_id: userId, event_type: "widget_click", entity_id: w.id, entity_type: "widget",
          source: "backfill", campaign: w.campaign, created_at: t,
        });
      }
    }

    // 2. Case studies — synthesize case_study_view
    const { data: caseStudies } = await admin
      .from("case_studies")
      .select("id, user_id, views, created_at, campaign")
      .eq("user_id", userId);

    for (const c of caseStudies || []) {
      const from = new Date(c.created_at || now);
      for (const t of spread(from, now, c.views || 0)) {
        events.push({
          user_id: userId, event_type: "case_study_view", entity_id: c.id, entity_type: "case_study",
          source: "backfill", campaign: c.campaign, created_at: t,
        });
      }
    }

    // 3. Approvals — use real timestamps
    const { data: testimonials } = await admin
      .from("testimonials")
      .select("id, user_id, status, approved_at, rejected_at, created_at, campaign")
      .eq("user_id", userId);

    for (const t of testimonials || []) {
      if (t.status === "approved" && t.approved_at) {
        events.push({
          user_id: userId, event_type: "approval_approved", entity_id: t.id, entity_type: "approval",
          source: "backfill", campaign: t.campaign, created_at: t.approved_at,
        });
      }
      if (t.status === "rejected" && t.rejected_at) {
        events.push({
          user_id: userId, event_type: "approval_rejected", entity_id: t.id, entity_type: "approval",
          source: "backfill", campaign: t.campaign, created_at: t.rejected_at,
        });
      }
    }

    // 4. Approval tokens sent — use creation date
    const { data: tokens } = await admin
      .from("approval_tokens")
      .select("testimonial_id, user_id, created_at, campaign")
      .eq("user_id", userId);

    for (const tk of tokens || []) {
      events.push({
        user_id: userId, event_type: "approval_sent", entity_id: tk.testimonial_id, entity_type: "approval",
        source: "backfill", campaign: tk.campaign, created_at: tk.created_at,
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true, dry_run: true, total: events.length, breakdown: {
          widgets: widgets?.length || 0,
          case_studies: caseStudies?.length || 0,
          testimonials: testimonials?.length || 0,
          tokens: tokens?.length || 0,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert in batches of 500
    let inserted = 0;
    for (let i = 0; i < events.length; i += 500) {
      const slice = events.slice(i, i + 500);
      const { error } = await admin.from("analytics_events").insert(slice);
      if (error) {
        return new Response(JSON.stringify({ error: error.message, inserted }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted += slice.length;
    }

    return new Response(JSON.stringify({ ok: true, inserted, breakdown: {
      widgets: widgets?.length || 0,
      case_studies: caseStudies?.length || 0,
      testimonials: testimonials?.length || 0,
      tokens: tokens?.length || 0,
    } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
