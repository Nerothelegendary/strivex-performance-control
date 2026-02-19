
-- ================================================================
-- SPRINT: Performance Hardening & Role Security
-- ================================================================

-- 1. COMPOSITE INDICES (IF NOT EXISTS)
-- workout_sessions: student history + weekly count filter
CREATE INDEX IF NOT EXISTS idx_workout_sessions_student_executed_desc
  ON public.workout_sessions (student_id, executed_at DESC);

-- activity_feed: trainer dashboard feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_trainer_created_desc
  ON public.activity_feed (trainer_id, created_at DESC);

-- 2. ROLE SECURITY: prevent a user who already has a role from self-assigning another
-- Drop the old permissive policy first
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

-- New policy: only allow insert if the user has NO existing role at all
CREATE POLICY "Users can insert own initial role"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role = ANY(ARRAY['trainer'::app_role, 'student'::app_role])
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = auth.uid()
    )
  );
