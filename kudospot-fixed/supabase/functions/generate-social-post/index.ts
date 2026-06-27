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

const PLATFORM_RULES: Record<string, string> = {
  linkedin: "Professional tone, 150-300 words, 3-5 hashtags, story-led, end with a question or insight.",
  instagram: "Punchy and emotional, 80-150 words, 8-12 hashtags, line breaks between paragraphs, emojis OK.",
  twitter: "Under 240 characters total, punchy opener, 2-3 hashtags max.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log("Function generate-social-post started");

  try {
    const { testimonial_id, platform } = await req.json();
    console.log(`Received request for testimonial_id: ${testimonial_id}, platform: ${platform}`);

    if (!testimonial_id || !PLATFORM_RULES[platform]) {
      console.error("Missing required fields");
      return new Response(JSON.stringify({ error: "Missing testimonial_id or platform (linkedin|instagram|twitter)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    console.log("Fetching user...");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User not found or unauthorized", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log(`User identified: ${user.id}`);

    console.log("Fetching profile and testimonial...");
    const [profileRes, testimonialRes] = await Promise.all([
      supabase.from("profiles").select("business_name, brand_voice").eq("id", user.id).maybeSingle(),
      supabase.from("testimonials").select("*").eq("id", testimonial_id).eq("user_id", user.id).maybeSingle()
    ]);

    const { data: profile } = profileRes;
    const { data: t } = testimonialRes;

    if (!t) {
      console.error("Testimonial not found");
      return new Response(JSON.stringify({ error: "Testimonial not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const text = t.approved_text || t.ai_rewritten_text || t.original_text;
    const systemPrompt = `You are an expert social media copywriter. Transform testimonials into authentic, high-converting posts. Match the platform rules exactly. Return ONLY the caption text — ready to copy-paste, with hashtags included at the end. No preamble, no quotes around the output.`;

    const userPrompt = `Platform: ${platform}
Platform rules: ${PLATFORM_RULES[platform]}
Business: ${profile?.business_name || "our business"}
Brand voice: ${profile?.brand_voice || "professional"}
Customer: ${t.customer_name}${t.customer_role ? `, ${t.customer_role}` : ""}${t.customer_company ? ` at ${t.customer_company}` : ""}
Testimonial:
"${sanitizeForAI(text || '')}"

Write the post.`;

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      console.error("GROQ_API_KEY not found in env");
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Calling Groq API...");
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
    const caption = aiData.choices?.[0]?.message?.content?.trim();
    
    if (!caption) {
      console.error("Empty AI response");
      return new Response(JSON.stringify({ error: "Empty AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("AI caption generated successfully");

    console.log("Inserting post into database using admin client...");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: post, error: insertError } = await supabaseAdmin
      .from("social_posts")
      .insert({
        user_id: user.id,
        testimonial_id: testimonial_id,
        platform: platform,
        caption_text: caption,
        status: "generated",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insertion failed", insertError);
      return new Response(JSON.stringify({ error: "Failed to save post to database: " + insertError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Post saved successfully:", post.id);
    return new Response(JSON.stringify({ post, caption }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Unexpected error in generate-social-post", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
