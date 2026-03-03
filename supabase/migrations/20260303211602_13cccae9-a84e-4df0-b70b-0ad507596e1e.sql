
-- P0: B-tree indexes on all FK columns for performance
CREATE INDEX IF NOT EXISTS idx_trainer_students_trainer_id ON public.trainer_students (trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_students_student_id ON public.trainer_students (student_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_student_id ON public.workout_sessions (student_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_template_id ON public.workout_sessions (template_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_executed_at ON public.workout_sessions (executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_sets_session_id ON public.session_sets (session_id);
CREATE INDEX IF NOT EXISTS idx_student_templates_student_id ON public.student_templates (student_id);
CREATE INDEX IF NOT EXISTS idx_student_templates_template_id ON public.student_templates (template_id);
CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON public.template_exercises (template_id);
CREATE INDEX IF NOT EXISTS idx_planned_sets_exercise_id ON public.planned_sets (exercise_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_trainer_id ON public.activity_feed (trainer_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_student_id ON public.activity_feed (student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_library_trainer_id ON public.exercise_library (trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainer_id ON public.trainer_notes (trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_student_id ON public.trainer_notes (student_id);

-- P0: Normalize exercise identity - unique constraint per trainer
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_library_trainer_name 
  ON public.exercise_library (trainer_id, lower(name));

-- P1: Dashboard consolidation RPC
CREATE OR REPLACE FUNCTION public.get_trainer_dashboard_summary(p_trainer_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_ids uuid[];
  v_total_students int;
  v_total_assigned int;
  v_weekly_completed int;
  v_week_ago timestamptz := now() - interval '7 days';
BEGIN
  -- Get all student IDs for this trainer
  SELECT array_agg(student_id), count(*)::int
  INTO v_student_ids, v_total_students
  FROM public.trainer_students
  WHERE trainer_id = p_trainer_id;

  IF v_student_ids IS NULL THEN
    RETURN json_build_object(
      'total_students', 0,
      'total_assigned', 0,
      'weekly_completed', 0,
      'students', '[]'::json
    );
  END IF;

  -- Total assigned templates
  SELECT count(*)::int INTO v_total_assigned
  FROM public.student_templates
  WHERE student_id = ANY(v_student_ids);

  -- Weekly completed sessions
  SELECT count(*)::int INTO v_weekly_completed
  FROM public.workout_sessions
  WHERE student_id = ANY(v_student_ids)
    AND executed_at >= v_week_ago;

  -- Return consolidated data with student details
  RETURN json_build_object(
    'total_students', v_total_students,
    'total_assigned', v_total_assigned,
    'weekly_completed', v_weekly_completed,
    'students', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT
          ts.student_id,
          p.full_name,
          p.avatar_url,
          (SELECT MAX(ws.executed_at) FROM public.workout_sessions ws WHERE ws.student_id = ts.student_id) AS last_session_at,
          (SELECT count(*)::int FROM public.student_templates st WHERE st.student_id = ts.student_id) AS assigned_templates
        FROM public.trainer_students ts
        LEFT JOIN public.profiles p ON p.user_id = ts.student_id
        WHERE ts.trainer_id = p_trainer_id
        ORDER BY p.full_name ASC NULLS LAST
      ) s
    )
  );
END;
$$;

-- P1: Role-change - update RLS to allow delete within 24h
CREATE POLICY "Users can delete own role within 24h"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND created_at > (now() - interval '24 hours')
);
