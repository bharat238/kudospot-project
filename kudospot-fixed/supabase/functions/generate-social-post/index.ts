import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_RULES: Record<string, string> = {
  linkedin: "Professional tone, 150-300 words, 3-5 hashtags, story-led, end with a question or insight.",
  instagram: "Punchy and emotional, 80-150 words, 8-12 hashtags, line breaks between paragraphs, emojis OK.",
  twitter: "Under 240 characters total, punchy opener, 2-3 hashtags max.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { testimonial_id, platform } = await req.json();
    if (!testimonial_id || !PLATFORM_RULES[platform]) {
      return new Response(JSON.stringify({ error: "Missing testimonial_id or platform (linkedin|instagram|twitter)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: profile } = await supabase.from("profiles").select("business_name, brand_voice").eq("id", user.id).maybeSingle();
    const { data: t } = await supabase.from("testimonials").select("*").eq("id", testimonial_id).eq("user_id", user.id).maybeSingle();
    if (!t) return new Response(JSON.stringify({ error: "Testimonial not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const text = t.approved_text || t.ai_rewritten_text || t.original_text;

    const systemPrompt = `You are an expert social media copywriter. Transform testimonials into authentic, high-converting posts. Match the platform rules exactly. Return ONLY the caption text — ready to copy-paste, with hashtags included at the end. No preamble, no quotes around the output.`;

    const userPrompt = `Platform: ${platform}
Platform rules: ${PLATFORM_RULES[platform]}
Business: ${profile?.business_name || "our business"}
Brand voice: ${profile?.brand_voice || "professional"}
Customer: ${t.customer_name}${t.customer_role ? `, ${t.customer_role}` : ""}${t.customer_company ? ` at ${t.customer_company}` : ""}
Testimonial:
"${text}"

Write the post.`;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Claude API error", aiResp.status, errText);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "AI rate limit hit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI request failed: " + aiResp.status }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    const caption = aiData.content?.[0]?.text?.trim();
    if (!caption) return new Response(JSON.stringify({ error: "Empty AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: post, error: postErr } = await supabase.from("social_posts").insert({
      user_id: user.id,
      testimonial_id,
      platform,
      caption_text: caption,
      status: "generated",
    }).select().single();

    if (postErr) return new Response(JSON.stringify({ error: postErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ post, caption }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-social-post error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
