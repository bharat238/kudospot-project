-- ═══════════════════════════════════════════════════════════
-- KudoSpot final migration — atomic counters + business_logo_url
-- ═══════════════════════════════════════════════════════════

-- Add business_logo_url to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_logo_url TEXT;

-- Ensure plan_expires_at exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Atomic widget counter functions (idempotent)
CREATE OR REPLACE FUNCTION public.increment_widget_views(widget_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.widgets SET views = COALESCE(views, 0) + 1 WHERE id = widget_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_widget_clicks(widget_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.widgets SET clicks = COALESCE(clicks, 0) + 1 WHERE id = widget_id;
$$;

-- Public policy for email_sends so anonymous approval flow can insert
DROP POLICY IF EXISTS "Public insert email sends" ON public.email_sends;
CREATE POLICY "Public insert email sends" ON public.email_sends
  FOR INSERT WITH CHECK (true);

-- Allow public (unauthenticated) to read approval tokens by token value
-- (needed for /approve/:token page which loads without auth)
DROP POLICY IF EXISTS "Public read token by value" ON public.approval_tokens;
CREATE POLICY "Public read token by value" ON public.approval_tokens
  FOR SELECT USING (true);

-- Ensure testimonials can be read via valid token (already exists but safe to re-create)
DROP POLICY IF EXISTS "Public read testimonials via token or publish" ON public.testimonials;
CREATE POLICY "Public read testimonials via token or publish" ON public.testimonials
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.approval_tokens t WHERE t.testimonial_id = testimonials.id)
    OR EXISTS (SELECT 1 FROM public.widgets w WHERE w.is_published = true AND testimonials.id = ANY(w.testimonial_ids))
    OR EXISTS (SELECT 1 FROM public.case_studies c WHERE c.is_published = true AND testimonials.id = ANY(c.testimonial_ids))
  );

-- Case study view counter RPC (called from PublicCaseStudy.tsx)
CREATE OR REPLACE FUNCTION public.increment_case_study_views(cs_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.case_studies SET views = COALESCE(views, 0) + 1 WHERE id = cs_id;
$$;
