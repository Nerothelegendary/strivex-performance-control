
-- ============================================================
-- 1. FIX CRITICAL SECURITY ISSUE — invitations RLS
-- ============================================================

-- Drop the insecure public SELECT policy
DROP POLICY IF EXISTS "Anyone can read invitations" ON public.invitations;

-- Trainers can only read their own invitations
CREATE POLICY "Trainers can read own invitations"
ON public.invitations
FOR SELECT
USING (trainer_id = auth.uid());

-- Students can only read an invitation they used (to verify acceptance)
CREATE POLICY "Students can read used invitations"
ON public.invitations
FOR SELECT
USING (used_by = auth.uid());


-- ============================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workout_sessions_student_executed
  ON public.workout_sessions (student_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_sets_session_id
  ON public.session_sets (session_id);

CREATE INDEX IF NOT EXISTS idx_activity_feed_trainer_created
  ON public.activity_feed (trainer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trainer_students_trainer_id
  ON public.trainer_students (trainer_id);

CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainer_student
  ON public.trainer_notes (trainer_id, student_id);


-- ============================================================
-- 3A. AGGREGATION FUNCTION — get_personal_bests
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_personal_bests(p_student_id UUID)
RETURNS TABLE(
  exercise_name TEXT,
  max_weight    NUMERIC,
  max_volume    NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ss.exercise_name,
    MAX(ss.weight)          AS max_weight,
    MAX(ss.reps * ss.weight) AS max_volume
  FROM public.session_sets ss
  JOIN public.workout_sessions ws ON ws.id = ss.session_id
  WHERE ws.student_id = p_student_id
  GROUP BY ss.exercise_name
  ORDER BY MAX(ss.weight) DESC;
$$;


-- ============================================================
-- 3B. AGGREGATION FUNCTION — get_volume_by_exercise
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_volume_by_exercise(p_student_id UUID)
RETURNS TABLE(
  exercise_name TEXT,
  total_volume  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ss.exercise_name,
    SUM(ss.reps * ss.weight) AS total_volume
  FROM public.session_sets ss
  JOIN public.workout_sessions ws ON ws.id = ss.session_id
  WHERE ws.student_id = p_student_id
  GROUP BY ss.exercise_name
  ORDER BY SUM(ss.reps * ss.weight) DESC;
$$;


-- ============================================================
-- 4. SERVER-SIDE TRIGGER — recalculate total_volume & exercise_count
--    Fires AFTER INSERT on session_sets to override client values.
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_session_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workout_sessions
  SET
    total_volume   = (
      SELECT COALESCE(SUM(reps * weight), 0)
      FROM public.session_sets
      WHERE session_id = NEW.session_id
    ),
    exercise_count = (
      SELECT COUNT(DISTINCT exercise_name)
      FROM public.session_sets
      WHERE session_id = NEW.session_id
    )
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$;

-- Drop if exists before creating to ensure idempotency
DROP TRIGGER IF EXISTS trg_recalculate_session_aggregates ON public.session_sets;

CREATE TRIGGER trg_recalculate_session_aggregates
AFTER INSERT ON public.session_sets
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_session_aggregates();
