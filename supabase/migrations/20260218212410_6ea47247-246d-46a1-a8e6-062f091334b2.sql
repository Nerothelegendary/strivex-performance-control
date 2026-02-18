
-- 1. Unique constraint on trainer_students to prevent duplicate links
ALTER TABLE public.trainer_students
  ADD CONSTRAINT trainer_students_trainer_student_unique UNIQUE (trainer_id, student_id);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_workout_sessions_student_id ON public.workout_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_trainer_students_trainer_id ON public.trainer_students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_student_templates_student_id ON public.student_templates(student_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
