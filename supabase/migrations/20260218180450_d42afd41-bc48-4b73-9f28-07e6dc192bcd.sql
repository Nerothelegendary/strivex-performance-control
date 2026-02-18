
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('trainer', 'student');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Invitation expiry validation trigger
CREATE OR REPLACE FUNCTION public.validate_invitation_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Invitation expiry must be in the future';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_invitation_expiry
  BEFORE INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.validate_invitation_expiry();

-- Trainer-Student relationship
CREATE TABLE public.trainer_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, student_id)
);
ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;

-- Now create get_trainer_id after trainer_students exists
CREATE OR REPLACE FUNCTION public.get_trainer_id(_student_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT trainer_id FROM public.trainer_students
  WHERE student_id = _student_user_id
  LIMIT 1
$$;

-- Trainer notes on students
CREATE TABLE public.trainer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trainer_notes ENABLE ROW LEVEL SECURITY;

-- Workout templates
CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

-- Template exercises
CREATE TABLE public.template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;

-- Planned sets per exercise
CREATE TABLE public.planned_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES public.template_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number INT NOT NULL,
  planned_reps INT NOT NULL,
  planned_weight NUMERIC(7,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planned_sets ENABLE ROW LEVEL SECURITY;

-- Assign templates to students
CREATE TABLE public.student_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, template_id)
);
ALTER TABLE public.student_templates ENABLE ROW LEVEL SECURITY;

-- Completed workout sessions (immutable)
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_volume NUMERIC(10,2) NOT NULL DEFAULT 0,
  exercise_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Executed sets within a session (immutable)
CREATE TABLE public.session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INT NOT NULL,
  reps INT NOT NULL,
  weight NUMERIC(7,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Trainers can read student profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainer_students ts WHERE ts.trainer_id = auth.uid() AND ts.student_id = profiles.user_id));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Trainers can create invitations" ON public.invitations
  FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid() AND public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Trainers can read own invitations" ON public.invitations
  FOR SELECT TO authenticated USING (trainer_id = auth.uid());

CREATE POLICY "Anyone can read invitation by token" ON public.invitations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Trainers can read their students" ON public.trainer_students
  FOR SELECT TO authenticated USING (trainer_id = auth.uid());

CREATE POLICY "Students can read their trainer link" ON public.trainer_students
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Can insert trainer_students" ON public.trainer_students
  FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Trainers can manage notes" ON public.trainer_notes
  FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can manage templates" ON public.workout_templates
  FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Students can read assigned templates" ON public.workout_templates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_templates st WHERE st.template_id = workout_templates.id AND st.student_id = auth.uid()));

CREATE POLICY "Trainers can manage exercises" ON public.template_exercises
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_templates wt WHERE wt.id = template_exercises.template_id AND wt.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_templates wt WHERE wt.id = template_exercises.template_id AND wt.trainer_id = auth.uid()));

CREATE POLICY "Students can read assigned exercises" ON public.template_exercises
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_templates st WHERE st.template_id = template_exercises.template_id AND st.student_id = auth.uid()));

CREATE POLICY "Trainers can manage planned sets" ON public.planned_sets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.template_exercises te JOIN public.workout_templates wt ON wt.id = te.template_id WHERE te.id = planned_sets.exercise_id AND wt.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.template_exercises te JOIN public.workout_templates wt ON wt.id = te.template_id WHERE te.id = planned_sets.exercise_id AND wt.trainer_id = auth.uid()));

CREATE POLICY "Students can read assigned planned sets" ON public.planned_sets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.template_exercises te JOIN public.student_templates st ON st.template_id = te.template_id WHERE te.id = planned_sets.exercise_id AND st.student_id = auth.uid()));

CREATE POLICY "Trainers can manage student templates" ON public.student_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainer_students ts WHERE ts.trainer_id = auth.uid() AND ts.student_id = student_templates.student_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trainer_students ts WHERE ts.trainer_id = auth.uid() AND ts.student_id = student_templates.student_id));

CREATE POLICY "Students can read own assigned templates" ON public.student_templates
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Students can insert own sessions" ON public.workout_sessions
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can read own sessions" ON public.workout_sessions
  FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE POLICY "Trainers can read student sessions" ON public.workout_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainer_students ts WHERE ts.trainer_id = auth.uid() AND ts.student_id = workout_sessions.student_id));

CREATE POLICY "Students can insert own session sets" ON public.session_sets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_sets.session_id AND ws.student_id = auth.uid()));

CREATE POLICY "Students can read own session sets" ON public.session_sets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_sets.session_id AND ws.student_id = auth.uid()));

CREATE POLICY "Trainers can read student session sets" ON public.session_sets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws JOIN public.trainer_students ts ON ts.student_id = ws.student_id WHERE ws.id = session_sets.session_id AND ts.trainer_id = auth.uid()));

-- ==========================================
-- TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_trainer_notes_updated_at BEFORE UPDATE ON public.trainer_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_workout_templates_updated_at BEFORE UPDATE ON public.workout_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
