-- Paid plans have a finite access period. Existing paid users without an expiry
-- receive a one-time 30-day grace period from migration time.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

UPDATE public.profiles
SET plan_expires_at = now() + interval '30 days'
WHERE plan IN ('starter', 'pro')
  AND plan_expires_at IS NULL;

-- Store verified Razorpay transactions to prevent a valid checkout response from being replayed
-- to extend paid access repeatedly. Service-role edge functions own all writes.
CREATE TABLE IF NOT EXISTS public.billing_payments (
  order_id text PRIMARY KEY,
  payment_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('starter', 'pro')),
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_billing_payments_user_created
  ON public.billing_payments (user_id, created_at DESC);

COMMENT ON TABLE public.billing_payments IS
  'Server-verified Razorpay plan payments. No user-facing RLS policies; edge functions use the service role.';

-- Authenticated users may update their profile details, but never grant themselves paid access.
-- Only server-side service-role code may set paid plans or billing identifiers.
CREATE OR REPLACE FUNCTION public.guard_profile_billing_fields()
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
    IF NEW.plan IS DISTINCT FROM 'free'
      OR NEW.plan_expires_at IS NOT NULL
      OR NEW.razorpay_customer_id IS NOT NULL
      OR NEW.stripe_customer_id IS NOT NULL THEN
      RAISE EXCEPTION 'Paid plan and billing fields are server-managed.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.razorpay_customer_id IS DISTINCT FROM OLD.razorpay_customer_id
    OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'Billing identifiers are server-managed.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
    OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
    -- Permit a safe fallback to Free only after the old paid period has expired.
    IF NOT (
      NEW.plan = 'free'
      AND OLD.plan IN ('starter', 'pro')
      AND OLD.plan_expires_at IS NOT NULL
      AND OLD.plan_expires_at <= now()
      AND NEW.plan_expires_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Paid access can only be granted by verified server-side payment.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_billing_fields ON public.profiles;
CREATE TRIGGER profiles_guard_billing_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_billing_fields();

