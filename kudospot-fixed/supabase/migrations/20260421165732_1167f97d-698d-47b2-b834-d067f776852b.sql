DROP POLICY IF EXISTS "Public insert events" ON public.analytics_events;

CREATE POLICY "Public insert valid events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (
    (entity_type = 'widget' AND EXISTS (
      SELECT 1 FROM public.widgets w
      WHERE w.id = entity_id AND w.is_published = true AND w.user_id = analytics_events.user_id
    ))
    OR (entity_type = 'case_study' AND EXISTS (
      SELECT 1 FROM public.case_studies c
      WHERE c.id = entity_id AND c.is_published = true AND c.user_id = analytics_events.user_id
    ))
    OR (entity_type = 'form' AND EXISTS (
      SELECT 1 FROM public.collection_forms f
      WHERE f.id = entity_id AND f.is_active = true AND f.user_id = analytics_events.user_id
    ))
    OR (entity_type = 'approval' AND EXISTS (
      SELECT 1 FROM public.approval_tokens t
      WHERE t.testimonial_id = entity_id AND t.user_id = analytics_events.user_id
    ))
  );