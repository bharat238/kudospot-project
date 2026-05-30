import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { testimonial_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: testimonial } = await supabase
      .from("testimonials")
      .select("*, profiles(business_name)")
      .eq("id", testimonial_id)
      .maybeSingle();

    if (!testimonial) return new Response(
      JSON.stringify({ error: "Testimonial not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );

    if (!testimonial.customer_email) return new Response(
      JSON.stringify({ error: "No customer email on this testimonial" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );

    const approveUrl = `${Deno.env.get("SITE_URL")}/approve/${testimonial.approval_token}`;
    const businessName = testimonial.profiles?.business_name || "Our team";

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: testimonial.customer_email,
        subject: `Does this sound like you, ${testimonial.customer_name}?`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;">
            <h2 style="color:#7C3AED;">Hi ${testimonial.customer_name},</h2>
            <p style="color:#444;">${businessName} would love to share your experience. 
            Here is the polished version — does it sound like you?</p>
            <div style="background:#f9f5ff;border-left:4px solid #7C3AED;
            padding:16px;border-radius:8px;margin:24px 0;">
              <p style="font-style:italic;color:#333;line-height:1.6;">
              "${testimonial.ai_rewritten_text}"</p>
            </div>
            <a href="${approveUrl}" 
            style="display:inline-block;background:#7C3AED;color:white;
            padding:14px 32px;border-radius:8px;text-decoration:none;
            font-weight:bold;font-size:16px;">
            ✓ Yes, approve this</a>
            <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
            If this does not sound right, simply reply to this email 
            and we will fix it. This approval link expires in 7 days.</p>
          </div>
        `
      })
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      return new Response(
        JSON.stringify({ error: "Email failed: " + err }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    await supabase.from("testimonials").update({
      approval_sent_at: new Date().toISOString(),
      approval_status: "sent"
    }).eq("id", testimonial_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );

  } catch(e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );
  }
});
