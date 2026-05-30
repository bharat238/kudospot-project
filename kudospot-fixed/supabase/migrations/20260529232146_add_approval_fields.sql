ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS approval_email_sent_at timestamptz;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS approval_token text DEFAULT replace(gen_random_uuid()::text, '-', '');
