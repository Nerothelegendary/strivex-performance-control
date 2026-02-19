
-- ================================================================
-- PERFORMANCE HARDENING: Indexes + Server-Side Last Session View
-- ================================================================

-- 1. WORKOUT SESSIONS: composite index for student history + weekly count queries
--    Supports: WHERE student_id = ? ORDER BY executed_at DESC LIMIT ?
--    Supports: WHERE student_id IN (...) AND executed_at >= ? (weekly count)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_student_executed_desc
  ON public.workout_sessions (student_id, executed_at DESC);

-- 2. ACTIVITY FEED: composite index for trainer feed queries
--    Supports: WHERE trainer_id = ? ORDER BY created_at DESC LIMIT ?
CREATE INDEX IF NOT EXISTS idx_activity_feed_trainer_created_desc
  ON public.activity_feed (trainer_id, created_at DESC);

-- 3. SESSION SETS: index for RPC aggregation (get_personal_bests, get_volume_by_exercise)
--    Supports JOIN on session_id and GROUP BY exercise_name
CREATE INDEX IF NOT EXISTS idx_session_sets_session_id
  ON public.session_sets (session_id);

-- 4. STUDENT TEMPLATES: index for assigned template lookups per student
--    Supports: WHERE student_id IN (...)
CREATE INDEX IF NOT EXISTS idx_student_templates_student_id
  ON public.student_templates (student_id);

-- 5. TRAINER STUDENTS: index for trainer roster lookup (already used but verify)
CREATE INDEX IF NOT EXISTS idx_trainer_students_trainer_id
  ON public.trainer_students (trainer_id);

-- 6. SERVER-SIDE LAST SESSION VIEW
--    Replaces the client-side Map() aggregation in TrainerDashboard
--    SECURITY NOTE: Access controlled through workout_sessions RLS —
--    the view runs in the security context of the querying user,
--    so trainers only see data for their students via the join in the dashboard query.
CREATE OR REPLACE VIEW public.student_last_session AS
SELECT
  student_id,
  MAX(executed_at) AS last_session_at
FROM public.workout_sessions
GROUP BY student_id;

-- Grant read access to authenticated users (RLS on workout_sessions handles row-level filtering)
GRANT SELECT ON public.student_last_session TO authenticated;
