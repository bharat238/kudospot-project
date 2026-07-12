-- FIX: approval_status is read/written by the frontend (Approve.tsx,
-- Testimonials.tsx, Analytics.tsx) and by two edge functions
-- (approve-testimonial, send-approval-email), but no prior migration ever
-- created this column. Any call touching it currently fails in production
-- with a real Postgres "column does not exist" error — this includes the
-- entire customer approval flow.
--
-- Values in use across the codebase: 'not_sent' (default), 'sent'
-- (send-approval-email sets this after emailing the customer), 'approved'
-- (Approve.tsx / approve-testimonial set this once the customer confirms).

ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'not_sent';

-- Backfill any existing rows sensibly based on data that already implies
-- their real state, so this migration doesn't silently reset history.
UPDATE public.testimonials
SET approval_status = 'approved'
WHERE approval_status = 'not_sent' AND status = 'approved';

UPDATE public.testimonials
SET approval_status = 'sent'
WHERE approval_status = 'not_sent' AND approval_email_sent_at IS NOT NULL;
