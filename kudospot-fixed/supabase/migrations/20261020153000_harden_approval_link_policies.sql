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

-- Public submission notifications must be tied to a real testimonial and sent at most once.
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS owner_notification_sent_at timestamptz;

-- Approval is a customer consent event, not a client-editable status. Only
-- service-role edge functions may set approval snapshots or notification receipts.
CREATE OR REPLACE FUNCTION public.guard_testimonial_consent_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text := coalesce(auth.role(), '');
BEGIN
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.approval_status = 'approved'
      OR NEW.approved_text IS NOT NULL
      OR NEW.approved_at IS NOT NULL
      OR NEW.status = 'published'
      OR NEW.approval_token IS NOT NULL
      OR NEW.owner_notification_sent_at IS NOT NULL THEN
      RAISE EXCEPTION 'Customer consent and notification fields are server-managed.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.approval_status = 'approved'
    AND (
      OLD.approval_status IS DISTINCT FROM 'approved'
      OR NEW.approved_text IS DISTINCT FROM OLD.approved_text
      OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
    ) THEN
    RAISE EXCEPTION 'Only the customer approval flow can record consent.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.approved_text IS DISTINCT FROM OLD.approved_text AND NEW.approved_text IS NOT NULL THEN
    RAISE EXCEPTION 'Approved wording is server-managed.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at AND NEW.approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Approval timestamps are server-managed.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Testimonials are published only through customer-approved content.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.approval_token IS DISTINCT FROM OLD.approval_token AND NEW.approval_token IS NOT NULL THEN
    RAISE EXCEPTION 'Approval tokens are server-managed.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.owner_notification_sent_at IS DISTINCT FROM OLD.owner_notification_sent_at THEN
    RAISE EXCEPTION 'Notification receipts are server-managed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS testimonials_guard_consent_fields ON public.testimonials;
CREATE TRIGGER testimonials_guard_consent_fields
  BEFORE INSERT OR UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_testimonial_consent_fields();
