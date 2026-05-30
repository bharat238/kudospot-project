import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: testimonial } = await supabase
      .from("testimonials")
      .select("*")
      .eq("approval_token", token)
      .maybeSingle();

    if (!testimonial) return new Response(
      JSON.stringify({ error: "Invalid or expired link" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );

    if (testimonial.approval_status === "approved") return new Response(
      JSON.stringify({ success: true, already_approved: true, 
      customer_name: testimonial.customer_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );

    await supabase.from("testimonials").update({
      status: "approved",
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      approved_text: testimonial.ai_rewritten_text
    }).eq("id", testimonial.id);

    return new Response(
      JSON.stringify({ success: true, customer_name: testimonial.customer_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );

  } catch(e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );
  }
});
