
-- Profiles additions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Email sequences
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sequence_name TEXT NOT NULL,
  emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage sequences" ON public.email_sequences;
CREATE POLICY "Owners manage sequences" ON public.email_sequences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Email sends
CREATE TABLE IF NOT EXISTS public.email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  campaign TEXT
);
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage sends" ON public.email_sends;
CREATE POLICY "Owners manage sends" ON public.email_sends
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic counters for widget views/clicks
CREATE OR REPLACE FUNCTION public.increment_widget_views(widget_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.widgets SET views = COALESCE(views, 0) + 1 WHERE id = widget_id AND is_published = true;
$$;

CREATE OR REPLACE FUNCTION public.increment_widget_clicks(widget_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.widgets SET clicks = COALESCE(clicks, 0) + 1 WHERE id = widget_id AND is_published = true;
$$;
