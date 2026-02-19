-- Allow trainers to remove students from their roster
CREATE POLICY "Trainers can delete their students"
ON public.trainer_students
FOR DELETE
USING (trainer_id = auth.uid());