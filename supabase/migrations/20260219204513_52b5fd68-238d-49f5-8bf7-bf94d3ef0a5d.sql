
-- ================================================================
-- FIX: Replace SECURITY DEFINER view with SECURITY INVOKER function
-- Views created by superuser inherit SECURITY DEFINER semantics by default,
-- bypassing RLS. A SECURITY INVOKER function correctly inherits the
-- calling user's permissions and row-level security context.
-- ================================================================

-- Drop the view that triggered the linter error
DROP VIEW IF EXISTS public.student_last_session;

-- Create a SECURITY INVOKER function that returns last session per student
-- for a given set of student IDs owned by the calling trainer.
-- The function inherits the caller's RLS context, so workout_sessions
-- policies are fully enforced — trainers only see their own students' data.
CREATE OR REPLACE FUNCTION public.get_last_sessions(p_student_ids uuid[])
RETURNS TABLE(student_id uuid, last_session_at timestamptz)
LANGUAGE sql
STABLE
-- SECURITY INVOKER (default) — inherits caller's RLS context
SET search_path TO 'public'
AS $$
  SELECT
    student_id,
    MAX(executed_at) AS last_session_at
  FROM public.workout_sessions
  WHERE student_id = ANY(p_student_ids)
  GROUP BY student_id;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.get_last_sessions(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_last_sessions(uuid[]) TO authenticated;
