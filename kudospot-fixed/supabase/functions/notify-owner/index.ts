import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiter — 10 req/min per IP
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

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const testimonial_id = body?.testimonial_id;
    if (!testimonial_id) {
      return new Response(
        JSON.stringify({ error: "Missing testimonial_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: testimonial, error: tErr } = await supabaseAdmin
      .from("testimonials")
      .select("id, customer_name, customer_company, original_text, rating, user_id")
      .eq("id", testimonial_id)
      .maybeSingle();

    if (tErr || !testimonial) {
      return new Response(
        JSON.stringify({ error: "Testimonial not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("business_name")
      .eq("id", testimonial.user_id)
      .maybeSingle();

    const { data: authUser, error: aErr } = await supabaseAdmin.auth.admin.getUserById(testimonial.user_id);
    const ownerEmail = authUser?.user?.email;

    if (!ownerEmail) {
      return new Response(
        JSON.stringify({ error: "Owner email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const businessName = profile?.business_name || "your business";
    const customerName = testimonial.customer_name || "A customer";
    const customerCompany = testimonial.customer_company ? ` from ${testimonial.customer_company}` : "";
    const snippet = (testimonial.original_text || "").slice(0, 200);
    const stars = "⭐".repeat(testimonial.rating || 5);
    const dashboardUrl = `${Deno.env.get("SITE_URL") || "https://kudospot.app"}/testimonials`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "KudoSpot <notifications@kudospot.app>",
        to: ownerEmail,
        subject: `New testimonial from ${customerName}${customerCompany} 🎉`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h2 style="color:#7C3AED;margin-bottom:4px;">New testimonial received!</h2>
            <p style="color:#6b7280;margin-top:0;">${businessName}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
            <p><strong>${customerName}</strong>${customerCompany}</p>
            <p style="font-size:20px;margin:4px 0;">${stars}</p>
            <blockquote style="border-left:3px solid #7C3AED;padding-left:16px;color:#374151;font-style:italic;">
              ${snippet}${testimonial.original_text?.length > 200 ? "…" : ""}
            </blockquote>
            <a href="${dashboardUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
              Review in dashboard →
            </a>
            <p style="margin-top:32px;font-size:12px;color:#9ca3af;">
              KudoSpot · You're receiving this because a customer submitted a testimonial for ${businessName}
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      return new Response(
        JSON.stringify({ error: "Email send failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-owner error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
