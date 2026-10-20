-- Enforce the published plan limits below the React UI so direct API calls
-- cannot bypass creation caps. Paid access expires after the timestamp on profiles.
CREATE OR REPLACE FUNCTION public.enforce_plan_resource_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text := coalesce(auth.role(), '');
  target_user_id uuid;
  active_plan text := 'free';
  expires_at timestamptz;
  current_count bigint := 0;
  limit_count integer;
BEGIN
  target_user_id := NEW.user_id;

  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Resources cannot be transferred between workspaces.'
      USING ERRCODE = '42501';
  END IF;

  -- AI rewrites are server-owned. The quota check runs for the service-role
  -- rewrite path too, under a profile row lock, to avoid concurrent overuse.
  IF TG_TABLE_NAME = 'testimonials'
    AND TG_OP = 'UPDATE'
    AND NEW.ai_rewritten_text IS DISTINCT FROM OLD.ai_rewritten_text
    AND NEW.ai_rewritten_text IS NOT NULL THEN

    IF caller_role <> 'service_role' THEN
      RAISE EXCEPTION 'AI rewrites must be created by the rewrite service.'
        USING ERRCODE = '42501';
    END IF;

    SELECT coalesce(p.plan, 'free'), p.plan_expires_at
    INTO active_plan, expires_at
    FROM public.profiles AS p
    WHERE p.id = target_user_id
    FOR UPDATE;

    IF active_plan NOT IN ('starter', 'pro')
      OR expires_at IS NULL
      OR expires_at <= now() THEN
      active_plan := 'free';
    END IF;

    IF active_plan = 'free' THEN
      SELECT count(*) INTO current_count
      FROM public.testimonials
      WHERE user_id = target_user_id
        AND ai_rewritten_text IS NOT NULL;
      IF current_count >= 5 THEN
        RAISE EXCEPTION 'Free plan limit reached: up to 5 AI rewrites.'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'testimonials' AND TG_OP = 'UPDATE' THEN
    IF caller_role <> 'service_role' AND auth.uid() IS DISTINCT FROM target_user_id THEN
      RAISE EXCEPTION 'You can only update testimonials in your own workspace.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Enforce resource creation quotas for service-role testimonial submissions
  -- as well as normal authenticated inserts. This is the final backstop behind
  -- the public submit edge function's own quota check.
  IF caller_role = 'service_role' AND NOT (TG_TABLE_NAME = 'testimonials' AND TG_OP = 'INSERT') THEN
    RETURN NEW;
  END IF;

  IF caller_role <> 'service_role' AND target_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only create resources in your own workspace.'
      USING ERRCODE = '42501';
  END IF;

  -- Serialize per-workspace insert checks to reduce concurrent quota races.
  SELECT coalesce(p.plan, 'free'), p.plan_expires_at
  INTO active_plan, expires_at
  FROM public.profiles AS p
  WHERE p.id = target_user_id
  FOR UPDATE;

  IF active_plan NOT IN ('starter', 'pro')
    OR expires_at IS NULL
    OR expires_at <= now() THEN
    active_plan := 'free';
  END IF;

  IF TG_TABLE_NAME = 'testimonials' AND TG_OP = 'INSERT' THEN
    IF active_plan = 'free' THEN
      SELECT count(*) INTO current_count
      FROM public.testimonials
      WHERE user_id = target_user_id;
      IF current_count >= 10 THEN
        RAISE EXCEPTION 'Free plan limit reached: up to 10 testimonials.'
          USING ERRCODE = '23514';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'widgets' AND TG_OP = 'INSERT' THEN
    limit_count := CASE active_plan WHEN 'starter' THEN 5 WHEN 'pro' THEN -1 ELSE 1 END;
    IF limit_count <> -1 THEN
      SELECT count(*) INTO current_count
      FROM public.widgets
      WHERE user_id = target_user_id;
      IF current_count >= limit_count THEN
        RAISE EXCEPTION 'Your current plan limit for widgets has been reached.'
          USING ERRCODE = '23514';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'case_studies' AND TG_OP = 'INSERT' THEN
    limit_count := CASE active_plan WHEN 'starter' THEN 3 WHEN 'pro' THEN -1 ELSE 0 END;
    IF limit_count <> -1 THEN
      SELECT count(*) INTO current_count
      FROM public.case_studies
      WHERE user_id = target_user_id;
      IF current_count >= limit_count THEN
        RAISE EXCEPTION 'Your current plan does not allow another case study.'
          USING ERRCODE = '23514';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'social_posts' AND TG_OP = 'INSERT' THEN
    IF active_plan = 'free' THEN
      RAISE EXCEPTION 'Social post generation requires a paid plan.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS testimonials_enforce_plan_limits ON public.testimonials;
CREATE TRIGGER testimonials_enforce_plan_limits
  BEFORE INSERT OR UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_resource_limits();

DROP TRIGGER IF EXISTS widgets_enforce_plan_limits ON public.widgets;
CREATE TRIGGER widgets_enforce_plan_limits
  BEFORE INSERT ON public.widgets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_resource_limits();

DROP TRIGGER IF EXISTS case_studies_enforce_plan_limits ON public.case_studies;
CREATE TRIGGER case_studies_enforce_plan_limits
  BEFORE INSERT ON public.case_studies
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_resource_limits();

DROP TRIGGER IF EXISTS social_posts_enforce_plan_limits ON public.social_posts;
CREATE TRIGGER social_posts_enforce_plan_limits
  BEFORE INSERT ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_resource_limits();
