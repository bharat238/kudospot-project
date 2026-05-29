import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (resets on cold start — good enough for edge)
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { testimonial_ids, client_name, context, campaign } = await req.json();
    if (!Array.isArray(testimonial_ids) || testimonial_ids.length === 0) {
      return new Response(JSON.stringify({ error: "Pick at least one testimonial." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: profile } = await supabase.from("profiles").select("business_name, brand_voice").eq("id", user.id).maybeSingle();
    // Security fix: always filter by user_id
    const { data: testimonials } = await supabase
      .from("testimonials")
      .select("customer_name, customer_role, customer_company, original_text, ai_rewritten_text, approved_text, rating")
      .in("id", testimonial_ids)
      .eq("user_id", user.id);

    if (!testimonials || testimonials.length === 0) {
      return new Response(JSON.stringify({ error: "No testimonials found. Make sure they belong to your account." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const testimonialBlock = testimonials.map((t, i) =>
      `--- Testimonial ${i + 1} ---\nFrom: ${t.customer_name}${t.customer_role ? `, ${t.customer_role}` : ""}${t.customer_company ? ` at ${t.customer_company}` : ""}\nRating: ${t.rating ?? "n/a"}\n${t.approved_text || t.ai_rewritten_text || t.original_text}`
    ).join("\n\n");

    const systemPrompt = `You are a world-class B2B case study writer. Transform customer testimonials into a compelling Problem → Solution → Results case study. NEVER fabricate stats not implied by the testimonials. Use confident, active language. You MUST respond with valid JSON only — no markdown, no preamble, no explanation. Return a JSON object with exactly these keys: title, challenge, solution, results, key_stats (array of 3 strings), pull_quote, about_client.`;

    const userPrompt = `Business: ${profile?.business_name || "the business"}
Brand voice: ${profile?.brand_voice || "professional"}
Client: ${client_name || "the client"}
${context ? `Context: ${context}` : ""}

Testimonials:
${testimonialBlock}

Generate the case study as JSON only.`;

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured in Supabase secrets." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const aiResp = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: systemPrompt + "\n\n" + userPrompt }],
          max_tokens: 500,
        }),
      }
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Groq API error", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "AI request failed: " + aiResp.status }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    const rawText = aiData.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed: any;
    try {
      const clean = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("JSON parse failed, raw:", rawText);
      return new Response(JSON.stringify({ error: "AI returned invalid JSON. Try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const slug = `${(client_name || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    const { data: cs, error: csErr } = await supabase.from("case_studies").insert({
      user_id: user.id,
      title: parsed.title || "Case Study",
      client_name: client_name || null,
      challenge: parsed.challenge || "",
      solution: parsed.solution || "",
      results: parsed.results || "",
      key_stats: parsed.key_stats || [],
      pull_quote: parsed.pull_quote || "",
      about_client: parsed.about_client || "",
      testimonial_ids,
      published_slug: slug,
      is_published: false,
      campaign: campaign || null,
    }).select().single();

    if (csErr) return new Response(JSON.stringify({ error: csErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ case_study: cs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-case-study error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
