
-- Function to get weekly volume for a student (last 12 weeks)
CREATE OR REPLACE FUNCTION public.get_weekly_volume(p_student_id uuid)
RETURNS TABLE(week_start date, total_volume numeric, session_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    date_trunc('week', ws.executed_at)::date AS week_start,
    COALESCE(SUM(ws.total_volume), 0) AS total_volume,
    COUNT(*) AS session_count
  FROM public.workout_sessions ws
  WHERE ws.student_id = p_student_id
    AND ws.executed_at >= (now() - interval '12 weeks')
  GROUP BY date_trunc('week', ws.executed_at)
  ORDER BY week_start ASC;
$$;
