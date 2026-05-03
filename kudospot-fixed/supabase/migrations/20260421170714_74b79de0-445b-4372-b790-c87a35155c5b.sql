ALTER TABLE public.collection_forms ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE public.widgets ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE public.case_studies ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE public.approval_tokens ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS campaign text;

CREATE INDEX IF NOT EXISTS idx_analytics_events_campaign ON public.analytics_events(user_id, campaign);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(user_id, created_at DESC);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_templates jsonb DEFAULT '[
  "Too short — needs more detail",
  "Customer wants edits before publishing",
  "Not representative of typical results",
  "Contains confidential information",
  "Too negative in tone",
  "Off-brand voice",
  "Inaccurate claim",
  "Needs more specific results",
  "Other"
]'::jsonb;