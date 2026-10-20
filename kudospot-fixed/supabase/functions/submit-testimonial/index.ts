import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
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

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const optionalText = (value: unknown, label: string, maxLength: number): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(label + " must be text.");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(label + " is too long.");
  return normalized || null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (isRateLimited(ip)) return json({ error: "Too many requests. Try again in a minute." }, 429);

  try {
    const body = await req.json();
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
    const formId = typeof body?.form_id === "string" ? body.form_id.trim() : "";
    const customerName = typeof body?.customer_name === "string" ? body.customer_name.trim() : "";
    const originalText = typeof body?.original_text === "string" ? body.original_text.trim() : "";

    if (!userId || !formId) return json({ error: "Missing form reference." }, 400);
    if (!customerName || customerName.length > 120) return json({ error: "Name must be between 1 and 120 characters." }, 400);
    if (originalText.length < 20 || originalText.length > 2000) {
      return json({ error: "Testimonial must be between 20 and 2000 characters." }, 400);
    }

    let customerRole: string | null;
    let customerCompany: string | null;
    let customerEmail: string | null;
    try {
      customerRole = optionalText(body?.customer_role, "Role", 120);
      customerCompany = optionalText(body?.customer_company, "Company", 120);
      customerEmail = optionalText(body?.customer_email, "Email", 254);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Invalid customer details." }, 400);
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return json({ error: "Enter a valid email address or leave the email field blank." }, 400);
    }

    const rating = body?.rating;
    if (rating !== undefined && rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return json({ error: "Rating must be a whole number from 1 to 5." }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Bind the submission to the exact active form, not merely any active form owned by user_id.
    const { data: form, error: formError } = await supabaseAdmin
      .from("collection_forms")
      .select("id,user_id,is_active,campaign")
      .eq("id", formId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (formError) {
      console.error("submit-testimonial form lookup failed:", formError.message);
      return json({ error: "Unable to validate this collection form." }, 500);
    }
    if (!form) return json({ error: "This collection form is inactive or no longer available." }, 403);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan,plan_expires_at")
      .eq("id", form.user_id)
      .maybeSingle();
    if (profileError) {
      console.error("submit-testimonial plan lookup failed:", profileError.message);
      return json({ error: "The workspace plan could not be checked." }, 500);
    }
    const paidPlanActive =
      (profile?.plan === "starter" || profile?.plan === "pro") &&
      typeof profile.plan_expires_at === "string" &&
      Date.parse(profile.plan_expires_at) > Date.now();
    if (!paidPlanActive) {
      const { count, error: countError } = await supabaseAdmin
        .from("testimonials")
        .select("id", { count: "exact", head: true })
        .eq("user_id", form.user_id);
      if (countError) {
        console.error("submit-testimonial quota lookup failed:", countError.message);
        return json({ error: "The workspace quota could not be checked." }, 500);
      }
      if ((count || 0) >= 10) {
        return json({ error: "This workspace has reached its Free plan limit of 10 testimonials." }, 403);
      }
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("testimonials")
      .insert({
        user_id: form.user_id,
        customer_name: customerName,
        customer_role: customerRole,
        customer_company: customerCompany,
        customer_email: customerEmail,
        original_text: originalText,
        rating: rating === undefined || rating === null ? null : rating,
        source: "form",
        status: "pending",
        campaign: form.campaign ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("submit-testimonial insert failed:", insertError.message);
      return json({ error: "Failed to submit testimonial." }, 500);
    }

    return json({ id: inserted.id });
  } catch (error) {
    console.error("submit-testimonial failed:", error instanceof Error ? error.message : String(error));
    return json({ error: "The testimonial could not be submitted. Please try again." }, 500);
  }
});
