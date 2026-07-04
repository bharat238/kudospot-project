-- Anon testimonial inserts now go exclusively through the submit-testimonial
-- edge function (service role key), which enforces the same active-form
-- check plus server-side IP rate limiting. This policy is no longer needed
-- and its removal closes the previously unrated-limited direct-insert path.
DROP POLICY IF EXISTS "Public can submit via form" ON public.testimonials;
