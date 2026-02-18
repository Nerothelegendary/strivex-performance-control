
-- 1. Exercise Library for trainer-specific + global exercises
CREATE TABLE public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exercise_library_trainer_name_unique UNIQUE (trainer_id, name)
);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage own exercises"
  ON public.exercise_library FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE INDEX idx_exercise_library_trainer_id ON public.exercise_library(trainer_id);

-- 2. Activity Feed for trainer notifications
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  student_id uuid NOT NULL,
  event_type text NOT NULL, -- 'workout_completed', 'personal_best'
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read own feed"
  ON public.activity_feed FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own feed"
  ON public.activity_feed FOR UPDATE
  USING (trainer_id = auth.uid());

CREATE POLICY "System can insert feed entries"
  ON public.activity_feed FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_activity_feed_trainer_id ON public.activity_feed(trainer_id);
CREATE INDEX idx_activity_feed_created_at ON public.activity_feed(created_at DESC);

-- 3. Enable realtime for activity_feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
