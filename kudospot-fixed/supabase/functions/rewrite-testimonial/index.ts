import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize user text before sending to AI — prevent prompt injection
function sanitizeForAI(text: string, maxLength = 3000): string {
  return text
    .slice(0, maxLength)
    .replace(/ignore previous instructions/gi, "[filtered]")
    .replace(/system prompt/gi, "[filtered]")
    .replace(/you are now/gi, "[filtered]")
    .trim();
}

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

const SYSTEM_PROMPT = (businessName: string, brandVoice: string) => `You are an expert copywriter and conversion specialist with 15 years of experience writing customer success stories that convert. Your job is to transform a raw customer testimonial into a compelling, specific, story-driven testimonial that will make prospects immediately trust and buy from this business.

RULES:
1. NEVER fabricate specific numbers, stats, or outcomes that are not in the original testimonial.
2. ALWAYS maintain the customer's authentic voice and emotional tone.
3. Extract any implied results and make them explicit only if reasonable.
4. Structure the rewrite as: [Pain/Before] → [Solution/During] → [Specific Result/After].
5. Start with the most compelling outcome (don't bury the lead).
6. Replace vague praise ("great", "helpful") with specific language.
7. Keep it between 40–80 words unless the original is much longer.
8. Match the business's brand voice: ${brandVoice}.
9. Write in first person from the customer's perspective.
10. End with a forward-looking statement when natural.

BUSINESS: ${businessName || "the business"}
BRAND VOICE: ${brandVoice}

Return ONLY the rewritten testimonial text. No preamble, no quotes, no explanation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { testimonial_id } = await req.json();
    if (!testimonial_id) return new Response(JSON.stringify({ error: "testimonial_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: t, error: tErr } = await supabase.from("testimonials").select("*").eq("id", testimonial_id).eq("user_id", user.id).single();
    if (tErr || !t) return new Response(JSON.stringify({ error: "Testimonial not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: profile } = await supabase.from("profiles").select("business_name, brand_voice").eq("id", user.id).maybeSingle();

    const userPrompt = `CUSTOMER NAME: ${t.customer_name}
CUSTOMER ROLE: ${t.customer_role || "(unspecified)"}
CUSTOMER COMPANY: ${t.customer_company || "(unspecified)"}

ORIGINAL TESTIMONIAL:
${sanitizeForAI(t.original_text || '')}

Rewrite this testimonial following all rules.`;

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const fullPrompt = SYSTEM_PROMPT(profile?.business_name || "", profile?.brand_voice || "friendly") + "\n\n" + userPrompt;

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
          messages: [{ role: "user", content: fullPrompt }],
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
    const rewritten = aiData.choices?.[0]?.message?.content?.trim();
    if (!rewritten) return new Response(JSON.stringify({ error: "Empty AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabase.from("testimonials").update({ ai_rewritten_text: rewritten, status: "ai_rewritten" }).eq("id", testimonial_id);

    return new Response(JSON.stringify({ rewritten }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("rewrite-testimonial error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
