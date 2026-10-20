-- Approval covers the wording and attribution as they stood at consent time.
CREATE OR REPLACE FUNCTION public.guard_testimonial_consent_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text := coalesce(auth.role(), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF caller_role <> 'service_role' AND (
      NEW.approval_status = 'approved'
      OR NEW.approved_text IS NOT NULL
      OR NEW.approved_at IS NOT NULL
      OR NEW.status = 'published'
      OR NEW.approval_token IS NOT NULL
      OR NEW.owner_notification_sent_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Customer consent and notification fields are server-managed.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF caller_role <> 'service_role' THEN
    IF NEW.approval_status = 'approved'
      AND (
        OLD.approval_status IS DISTINCT FROM 'approved'
        OR NEW.approved_text IS DISTINCT FROM OLD.approved_text
        OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
      ) THEN
      RAISE EXCEPTION 'Only the customer approval flow can record consent.'
        USING ERRCODE = '42501';
    END IF;

    IF OLD.approval_status = 'approved'
      AND NEW.approval_status = 'approved'
      AND (
        NEW.original_text IS DISTINCT FROM OLD.original_text
        OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
        OR NEW.customer_role IS DISTINCT FROM OLD.customer_role
        OR NEW.customer_company IS DISTINCT FROM OLD.customer_company
        OR NEW.customer_email IS DISTINCT FROM OLD.customer_email
        OR NEW.rating IS DISTINCT FROM OLD.rating
      ) THEN
      RAISE EXCEPTION 'Revoke customer approval before editing testimonial wording or attribution.'
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
  END IF;

  RETURN NEW;
END;
$$;

-- Enforce customer consent when public content is switched on or its source
-- testimonials change, including direct authenticated PostgREST calls.
CREATE OR REPLACE FUNCTION public.require_approved_publication_sources()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_ids uuid[];
  expected_count integer;
  approved_count integer;
BEGIN
  IF NEW.is_published IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  source_ids := NEW.testimonial_ids;
  expected_count := coalesce(cardinality(source_ids), 0);

  IF expected_count = 0 THEN
    RAISE EXCEPTION 'Select at least one customer-approved testimonial before publishing.'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO approved_count
  FROM unnest(source_ids) AS selected(testimonial_id)
  WHERE EXISTS (
    SELECT 1
    FROM public.testimonials AS t
    WHERE t.id = selected.testimonial_id
      AND t.user_id = NEW.user_id
      AND t.approval_status = 'approved'
  );

  IF approved_count <> expected_count THEN
    RAISE EXCEPTION 'Every testimonial included in public content must have current customer approval.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS widgets_require_approved_sources ON public.widgets;
CREATE TRIGGER widgets_require_approved_sources
  BEFORE INSERT OR UPDATE OF is_published, testimonial_ids, user_id
  ON public.widgets
  FOR EACH ROW EXECUTE FUNCTION public.require_approved_publication_sources();

DROP TRIGGER IF EXISTS case_studies_require_approved_sources ON public.case_studies;
CREATE TRIGGER case_studies_require_approved_sources
  BEFORE INSERT OR UPDATE OF is_published, testimonial_ids, user_id
  ON public.case_studies
  FOR EACH ROW EXECUTE FUNCTION public.require_approved_publication_sources();

-- If approved wording or attribution is withdrawn/changed, immediately take
-- linked case studies offline even when the change comes through an edge function.
CREATE OR REPLACE FUNCTION public.unpublish_case_studies_after_consent_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approval_status = 'approved'
    AND (
      NEW.approval_status IS DISTINCT FROM 'approved'
      OR NEW.approved_text IS DISTINCT FROM OLD.approved_text
      OR NEW.original_text IS DISTINCT FROM OLD.original_text
      OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
      OR NEW.customer_role IS DISTINCT FROM OLD.customer_role
      OR NEW.customer_company IS DISTINCT FROM OLD.customer_company
      OR NEW.customer_email IS DISTINCT FROM OLD.customer_email
      OR NEW.rating IS DISTINCT FROM OLD.rating
    ) THEN
    UPDATE public.case_studies
    SET is_published = false
    WHERE user_id = OLD.user_id
      AND is_published = true
      AND OLD.id = ANY(testimonial_ids);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS testimonials_unpublish_case_studies_after_consent_change ON public.testimonials;
CREATE TRIGGER testimonials_unpublish_case_studies_after_consent_change
  AFTER UPDATE OF approval_status, approved_text, original_text, customer_name, customer_role, customer_company, customer_email, rating
  ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.unpublish_case_studies_after_consent_change();
