import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Try again in a minute." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const {
      user_id,
      customer_name,
      customer_role,
      customer_company,
      customer_email,
      original_text,
      rating,
      campaign,
    } = body;

    if (typeof user_id !== "string" || !user_id.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid user_id." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = typeof original_text === "string" ? original_text.trim() : "";
    if (text.length < 20 || text.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Testimonial must be between 20 and 2000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: forms, error: formError } = await supabase
      .from("collection_forms")
      .select("id")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .limit(1);

    if (formError) {
      console.error("submit-testimonial form lookup error", formError);
      return new Response(
        JSON.stringify({ error: "Unable to validate form access." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!forms || forms.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active form found for this user." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("testimonials")
      .insert({
        user_id,
        customer_name,
        customer_role: customer_role ?? null,
        customer_company: customer_company ?? null,
        customer_email: customer_email ?? null,
        original_text,
        rating: typeof rating === "number" ? rating : null,
        source: "form",
        status: "pending",
        campaign: campaign ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("submit-testimonial insert error", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit testimonial." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ id: inserted?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("submit-testimonial unexpected error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
