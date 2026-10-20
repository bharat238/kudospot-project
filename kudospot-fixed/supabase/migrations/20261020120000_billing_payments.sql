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
