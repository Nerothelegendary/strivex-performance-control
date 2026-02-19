
-- Drop the redundant constraint (and its backing index) via the correct syntax
ALTER TABLE public.trainer_students
  DROP CONSTRAINT IF EXISTS trainer_students_trainer_student_unique;
