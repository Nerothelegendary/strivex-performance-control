
-- ================================================================
-- CLEANUP: Drop redundant indexes superseded by composite ones
-- ================================================================

-- workout_sessions: idx_workout_sessions_student_id (single col) is fully
-- superseded by the composite (student_id, executed_at DESC) index.
-- Postgres can use the composite for any query that filters by student_id alone.
DROP INDEX IF EXISTS public.idx_workout_sessions_student_id;

-- workout_sessions: two identical composite indexes exist (created in different sessions)
-- Keep the explicitly named one, drop the earlier unnamed variant
DROP INDEX IF EXISTS public.idx_workout_sessions_student_executed;

-- activity_feed: two separate redundant indexes exist
-- idx_activity_feed_trainer_id (single col) superseded by composite
-- idx_activity_feed_created_at (single col, no trainer filter) not useful for our queries
-- idx_activity_feed_trainer_created (duplicate of _desc variant)
DROP INDEX IF EXISTS public.idx_activity_feed_trainer_id;
DROP INDEX IF EXISTS public.idx_activity_feed_created_at;
DROP INDEX IF EXISTS public.idx_activity_feed_trainer_created;
