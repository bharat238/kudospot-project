
-- COLLECTION FORMS
CREATE TABLE public.collection_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  form_name text NOT NULL,
  headline text NOT NULL DEFAULT 'Share your experience',
  subheadline text DEFAULT 'We''d love to hear how it went.',
  questions jsonb DEFAULT '["What problem were you trying to solve?", "What did you love most?", "What specific result did you get?"]'::jsonb,
  brand_color text DEFAULT '#7C3AED',
  logo_url text,
  thank_you_message text DEFAULT 'Thank you! Your feedback means a lot.',
  collect_video boolean DEFAULT false,
  collect_rating boolean DEFAULT true,
  public_slug text UNIQUE NOT NULL DEFAULT lower(substr(md5(random()::text), 1, 10)),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.collection_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage forms" ON public.collection_forms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read active forms" ON public.collection_forms FOR SELECT USING (is_active = true);

-- Allow anonymous submissions to testimonials when there's a matching active form
DROP POLICY IF EXISTS "Public can submit via form" ON public.testimonials;
CREATE POLICY "Public can submit via form" ON public.testimonials
  FOR INSERT WITH CHECK (
    source = 'form'
    AND EXISTS (SELECT 1 FROM public.collection_forms f WHERE f.user_id = testimonials.user_id AND f.is_active = true)
  );

-- WIDGETS
CREATE TABLE public.widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  widget_name text NOT NULL,
  widget_type text NOT NULL DEFAULT 'wall',
  testimonial_ids uuid[] DEFAULT '{}',
  settings jsonb DEFAULT '{"primary_color":"#7C3AED","background":"#FFFFFF","radius":12,"show_rating":true,"show_avatar":true}'::jsonb,
  is_published boolean DEFAULT true,
  views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage widgets" ON public.widgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read published widgets" ON public.widgets FOR SELECT USING (is_published = true);

-- CASE STUDIES
CREATE TABLE public.case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  client_name text,
  challenge text,
  solution text,
  results text,
  key_stats jsonb DEFAULT '[]'::jsonb,
  pull_quote text,
  about_client text,
  testimonial_ids uuid[] DEFAULT '{}',
  published_slug text UNIQUE DEFAULT lower(substr(md5(random()::text), 1, 12)),
  is_published boolean DEFAULT false,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage case studies" ON public.case_studies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read published case studies" ON public.case_studies FOR SELECT USING (is_published = true);

-- SOCIAL POSTS
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  testimonial_id uuid NOT NULL,
  platform text NOT NULL,
  caption_text text NOT NULL,
  status text DEFAULT 'generated',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage social posts" ON public.social_posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- APPROVAL TOKENS
CREATE TABLE public.approval_tokens (
  token text PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  testimonial_id uuid NOT NULL,
  user_id uuid NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage tokens" ON public.approval_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read tokens" ON public.approval_tokens FOR SELECT USING (true);
CREATE POLICY "Public mark token used" ON public.approval_tokens FOR UPDATE USING (used_at IS NULL);

-- Allow public read of testimonials referenced by a valid (unused) token, OR included in a published widget/case study
DROP POLICY IF EXISTS "Public read testimonials via token or publish" ON public.testimonials;
CREATE POLICY "Public read testimonials via token or publish" ON public.testimonials
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.approval_tokens t WHERE t.testimonial_id = testimonials.id)
    OR EXISTS (SELECT 1 FROM public.widgets w WHERE w.is_published = true AND testimonials.id = ANY(w.testimonial_ids))
    OR EXISTS (SELECT 1 FROM public.case_studies c WHERE c.is_published = true AND testimonials.id = ANY(c.testimonial_ids))
  );

-- Allow public update of a testimonial when approving via a valid unused token
DROP POLICY IF EXISTS "Public approve via token" ON public.testimonials;
CREATE POLICY "Public approve via token" ON public.testimonials
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.approval_tokens t WHERE t.testimonial_id = testimonials.id AND t.used_at IS NULL)
  );
