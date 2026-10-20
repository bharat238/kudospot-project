-- Approval-token snapshots are immutable for client roles. Owners may revoke
-- an unused link, but cannot rewrite its text or make a consumed link active again.
CREATE OR REPLACE FUNCTION public.guard_approval_token_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text := coalesce(auth.role(), '');
  current_text text;
BEGIN
  IF caller_role = 'service_role' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Approval links must belong to your workspace.'
        USING ERRCODE = '42501';
    END IF;

    SELECT coalesce(nullif(t.ai_rewritten_text, ''), t.original_text)
    INTO current_text
    FROM public.testimonials AS t
    WHERE t.id = NEW.testimonial_id
      AND t.user_id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The approval link must reference a testimonial in your workspace.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.approval_text IS DISTINCT FROM current_text THEN
      RAISE EXCEPTION 'Approval text must match the current testimonial wording.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.used_at IS NOT NULL THEN
      RAISE EXCEPTION 'New approval links must start unused.'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS NULL OR OLD.user_id IS DISTINCT FROM auth.uid() OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Approval links can only be managed by their workspace owner.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.token IS DISTINCT FROM OLD.token
      OR NEW.testimonial_id IS DISTINCT FROM OLD.testimonial_id
      OR NEW.approval_text IS DISTINCT FROM OLD.approval_text
      OR NEW.campaign IS DISTINCT FROM OLD.campaign
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Approval-link identity and wording are immutable.'
        USING ERRCODE = '42501';
    END IF;

    IF OLD.used_at IS NOT NULL AND NEW.used_at IS DISTINCT FROM OLD.used_at THEN
      RAISE EXCEPTION 'A revoked or consumed approval link cannot be reactivated.'
        USING ERRCODE = '42501';
    END IF;

    IF OLD.used_at IS NULL AND NEW.used_at IS NOT NULL THEN
      RETURN NEW; -- Owner is allowed to revoke an unused link.
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Permit FK cascades after the owning testimonial has been deleted, but
    -- prevent a workspace owner from erasing a token while its testimonial exists.
    IF EXISTS (
      SELECT 1 FROM public.testimonials AS t
      WHERE t.id = OLD.testimonial_id
    ) THEN
      RAISE EXCEPTION 'Approval links cannot be deleted; revoke unused links instead.'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- Remove unusable orphan tokens before adding the FK. A token without a
-- matching testimonial cannot represent a consent request.
DELETE FROM public.approval_tokens AS token
WHERE NOT EXISTS (
  SELECT 1
  FROM public.testimonials AS t
  WHERE t.id = token.testimonial_id
    AND t.user_id = token.user_id
);

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'approval_tokens_testimonial_id_fkey'
      AND conrelid = 'public.approval_tokens'::regclass
  ) THEN
    ALTER TABLE public.approval_tokens
      ADD CONSTRAINT approval_tokens_testimonial_id_fkey
      FOREIGN KEY (testimonial_id)
      REFERENCES public.testimonials(id)
      ON DELETE CASCADE;
  END IF;
END;
$;

DROP TRIGGER IF EXISTS approval_tokens_guard_mutations ON public.approval_tokens;
CREATE TRIGGER approval_tokens_guard_mutations
  BEFORE INSERT OR UPDATE OR DELETE
  ON public.approval_tokens
  FOR EACH ROW EXECUTE FUNCTION public.guard_approval_token_mutations();
