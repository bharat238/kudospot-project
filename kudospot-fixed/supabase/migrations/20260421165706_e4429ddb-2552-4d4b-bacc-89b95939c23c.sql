-- Analytics events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  entity_id uuid,
  entity_type text,
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_agent text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_user_created ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_entity ON public.analytics_events(entity_id, event_type);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read events"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public insert events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Rejection fields on testimonials
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- Public form-assets bucket for logo uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-assets', 'form-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read form assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-assets');

CREATE POLICY "Users upload own form assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'form-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own form assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'form-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own form assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'form-assets' AND auth.uid()::text = (storage.foldername(name))[1]);