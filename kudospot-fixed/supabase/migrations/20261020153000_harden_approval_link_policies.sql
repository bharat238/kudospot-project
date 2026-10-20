-- Approval links are bearer secrets. Public users must not be able to enumerate
-- tokens, mark tokens as used, or update testimonial rows directly.
ALTER TABLE public.approval_tokens
  ADD COLUMN IF NOT EXISTS approval_text text;

-- Freeze the text attached to older active links at migration time. New links
-- store an explicit immutable snapshot when they are generated.
UPDATE public.approval_tokens AS token
SET approval_text = COALESCE(t.ai_rewritten_text, t.original_text)
FROM public.testimonials AS t
WHERE t.id = token.testimonial_id
  AND token.approval_text IS NULL
  AND token.used_at IS NULL;

DROP POLICY IF EXISTS "Public read tokens" ON public.approval_tokens;
DROP POLICY IF EXISTS "Public read token by value" ON public.approval_tokens;
DROP POLICY IF EXISTS "Public mark token used" ON public.approval_tokens;
DROP POLICY IF EXISTS "Public approve via token" ON public.testimonials;
DROP POLICY IF EXISTS "Public read testimonials via token or publish" ON public.testimonials;

-- Public testimonials are visible only after customer approval and only when
-- the owner has an active collection form (used for their Wall of Love), or
-- the testimonial appears in a published widget or case study.
CREATE POLICY "Public read approved testimonials in published content"
  ON public.testimonials
  FOR SELECT
  USING (
    approval_status = 'approved'
    AND (
      EXISTS (
        SELECT 1
        FROM public.collection_forms AS f
        WHERE f.user_id = testimonials.user_id
          AND f.is_active = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.widgets AS w
        WHERE w.user_id = testimonials.user_id
          AND w.is_published = true
          AND testimonials.id = ANY(w.testimonial_ids)
      )
      OR EXISTS (
        SELECT 1
        FROM public.case_studies AS c
        WHERE c.user_id = testimonials.user_id
          AND c.is_published = true
          AND testimonials.id = ANY(c.testimonial_ids)
      )
    )
  );

-- Expose only public branding fields for active collection forms. A table-level
-- profiles SELECT policy would also expose unrelated private billing/account fields.
CREATE OR REPLACE VIEW public.public_business_profiles
WITH (security_barrier = true)
AS
SELECT p.id AS user_id, p.business_name, p.business_logo_url
FROM public.profiles AS p
WHERE EXISTS (
  SELECT 1
  FROM public.collection_forms AS f
  WHERE f.user_id = p.id
    AND f.is_active = true
);

GRANT SELECT ON public.public_business_profiles TO anon, authenticated;
