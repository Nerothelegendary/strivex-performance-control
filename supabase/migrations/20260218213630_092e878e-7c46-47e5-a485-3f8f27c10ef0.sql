
-- Tighten the INSERT policy: only allow students to insert entries for their own trainer
DROP POLICY "System can insert feed entries" ON public.activity_feed;

CREATE POLICY "Students can insert feed for their trainer"
  ON public.activity_feed FOR INSERT
  WITH CHECK (
    student_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.trainer_students ts
      WHERE ts.trainer_id = activity_feed.trainer_id 
      AND ts.student_id = auth.uid()
    )
  );
