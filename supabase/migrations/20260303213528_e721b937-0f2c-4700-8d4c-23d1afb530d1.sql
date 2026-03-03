
-- 1. Deep clone function (for trainer's own templates)
CREATE OR REPLACE FUNCTION public.clone_workout_template(
  p_template_id uuid,
  p_new_owner_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_template_id uuid;
  v_source_owner uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_new_owner_id THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = 'P0001';
  END IF;

  SELECT trainer_id INTO v_source_owner
  FROM public.workout_templates WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEMPLATE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_source_owner != p_new_owner_id THEN
    RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE = 'P0003';
  END IF;

  INSERT INTO public.workout_templates (trainer_id, name, description)
  SELECT p_new_owner_id, name || ' (cópia)', description
  FROM public.workout_templates WHERE id = p_template_id
  RETURNING id INTO v_new_template_id;

  WITH old_exercises AS (
    SELECT id, sort_order, name,
      row_number() OVER (ORDER BY sort_order, id) AS rn
    FROM public.template_exercises
    WHERE template_id = p_template_id
  ),
  new_exercises AS (
    INSERT INTO public.template_exercises (template_id, name, sort_order)
    SELECT v_new_template_id, oe.name, oe.sort_order
    FROM old_exercises oe ORDER BY oe.rn
    RETURNING id, sort_order
  ),
  new_with_rn AS (
    SELECT id, row_number() OVER (ORDER BY sort_order, id) AS rn FROM new_exercises
  ),
  exercise_map AS (
    SELECT o.id AS old_id, n.id AS new_id
    FROM old_exercises o JOIN new_with_rn n ON n.rn = o.rn
  )
  INSERT INTO public.planned_sets (exercise_id, set_number, planned_reps, planned_weight)
  SELECT em.new_id, ps.set_number, ps.planned_reps, ps.planned_weight
  FROM public.planned_sets ps
  JOIN exercise_map em ON em.old_id = ps.exercise_id;

  RETURN v_new_template_id;
END;
$$;

-- 2. Starter templates table (self-contained, no FK to workout_templates)
CREATE TABLE IF NOT EXISTS public.starter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  goal_type text NOT NULL DEFAULT 'general',
  difficulty_level text NOT NULL DEFAULT 'beginner',
  is_public boolean NOT NULL DEFAULT true,
  exercise_count integer NOT NULL DEFAULT 0,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.starter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read public starters"
ON public.starter_templates FOR SELECT
TO authenticated
USING (is_public = true);

CREATE INDEX IF NOT EXISTS idx_starter_templates_goal ON public.starter_templates(goal_type);

-- 3. Clone starter template function
CREATE OR REPLACE FUNCTION public.clone_starter_template(
  p_starter_id uuid,
  p_new_owner_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_starter public.starter_templates%ROWTYPE;
  v_new_template_id uuid;
  v_exercise jsonb;
  v_new_exercise_id uuid;
  v_set_val jsonb;
  v_sort int := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_new_owner_id THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_starter FROM public.starter_templates
  WHERE id = p_starter_id AND is_public = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STARTER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.workout_templates (trainer_id, name, description)
  VALUES (p_new_owner_id, v_starter.name, v_starter.description)
  RETURNING id INTO v_new_template_id;

  FOR v_exercise IN SELECT * FROM jsonb_array_elements(v_starter.exercises)
  LOOP
    v_sort := v_sort + 1;
    INSERT INTO public.template_exercises (template_id, name, sort_order)
    VALUES (v_new_template_id, v_exercise->>'name', v_sort)
    RETURNING id INTO v_new_exercise_id;

    IF v_exercise ? 'sets' THEN
      FOR v_set_val IN SELECT * FROM jsonb_array_elements(v_exercise->'sets')
      LOOP
        INSERT INTO public.planned_sets (exercise_id, set_number, planned_reps, planned_weight)
        VALUES (
          v_new_exercise_id,
          (v_set_val->>'set_number')::int,
          (v_set_val->>'reps')::int,
          COALESCE((v_set_val->>'weight')::numeric, 0)
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_new_template_id;
END;
$$;

-- 4. Seed starter templates
INSERT INTO public.starter_templates (name, description, goal_type, difficulty_level, exercise_count, exercises) VALUES
(
  'Full Body - Iniciante',
  'Treino corpo inteiro para iniciantes. Ideal para 3x por semana.',
  'hypertrophy', 'beginner', 5,
  '[
    {"name":"Agachamento Livre","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]},
    {"name":"Supino Reto","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]},
    {"name":"Remada Curvada","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]},
    {"name":"Desenvolvimento com Halteres","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]},
    {"name":"Leg Press","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]}
  ]'::jsonb
),
(
  'Push (Empurrar)',
  'Treino focado em peito, ombro e tríceps.',
  'hypertrophy', 'intermediate', 6,
  '[
    {"name":"Supino Reto","sets":[{"set_number":1,"reps":10,"weight":0},{"set_number":2,"reps":10,"weight":0},{"set_number":3,"reps":8,"weight":0}]},
    {"name":"Supino Inclinado com Halteres","sets":[{"set_number":1,"reps":10,"weight":0},{"set_number":2,"reps":10,"weight":0},{"set_number":3,"reps":8,"weight":0}]},
    {"name":"Desenvolvimento Militar","sets":[{"set_number":1,"reps":10,"weight":0},{"set_number":2,"reps":10,"weight":0},{"set_number":3,"reps":8,"weight":0}]},
    {"name":"Elevação Lateral","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":12,"weight":0}]},
    {"name":"Tríceps Corda","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]},
    {"name":"Tríceps Francês","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]}
  ]'::jsonb
),
(
  'Pull (Puxar)',
  'Treino focado em costas e bíceps.',
  'hypertrophy', 'intermediate', 5,
  '[
    {"name":"Barra Fixa","sets":[{"set_number":1,"reps":8,"weight":0},{"set_number":2,"reps":8,"weight":0},{"set_number":3,"reps":6,"weight":0}]},
    {"name":"Remada Curvada","sets":[{"set_number":1,"reps":10,"weight":0},{"set_number":2,"reps":10,"weight":0},{"set_number":3,"reps":8,"weight":0}]},
    {"name":"Pulldown","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]},
    {"name":"Rosca Direta","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]},
    {"name":"Rosca Martelo","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]}
  ]'::jsonb
),
(
  'Força - Upper Body',
  'Treino de força para membros superiores. Séries pesadas com baixas repetições.',
  'strength', 'advanced', 4,
  '[
    {"name":"Supino Reto","sets":[{"set_number":1,"reps":5,"weight":0},{"set_number":2,"reps":5,"weight":0},{"set_number":3,"reps":5,"weight":0},{"set_number":4,"reps":5,"weight":0},{"set_number":5,"reps":3,"weight":0}]},
    {"name":"Barra Fixa","sets":[{"set_number":1,"reps":5,"weight":0},{"set_number":2,"reps":5,"weight":0},{"set_number":3,"reps":5,"weight":0},{"set_number":4,"reps":5,"weight":0},{"set_number":5,"reps":3,"weight":0}]},
    {"name":"Desenvolvimento com Barra","sets":[{"set_number":1,"reps":5,"weight":0},{"set_number":2,"reps":5,"weight":0},{"set_number":3,"reps":5,"weight":0},{"set_number":4,"reps":5,"weight":0},{"set_number":5,"reps":3,"weight":0}]},
    {"name":"Remada Cavaleiro","sets":[{"set_number":1,"reps":5,"weight":0},{"set_number":2,"reps":5,"weight":0},{"set_number":3,"reps":5,"weight":0},{"set_number":4,"reps":5,"weight":0},{"set_number":5,"reps":3,"weight":0}]}
  ]'::jsonb
),
(
  'Legs Day',
  'Treino completo de pernas com foco em quadríceps, posteriores e glúteos.',
  'hypertrophy', 'intermediate', 6,
  '[
    {"name":"Agachamento Livre","sets":[{"set_number":1,"reps":10,"weight":0},{"set_number":2,"reps":10,"weight":0},{"set_number":3,"reps":8,"weight":0},{"set_number":4,"reps":8,"weight":0}]},
    {"name":"Leg Press","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":10,"weight":0}]},
    {"name":"Cadeira Extensora","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":12,"weight":0}]},
    {"name":"Mesa Flexora","sets":[{"set_number":1,"reps":12,"weight":0},{"set_number":2,"reps":12,"weight":0},{"set_number":3,"reps":12,"weight":0}]},
    {"name":"Elevação Pélvica","sets":[{"set_number":1,"reps":15,"weight":0},{"set_number":2,"reps":15,"weight":0},{"set_number":3,"reps":12,"weight":0}]},
    {"name":"Panturrilha em Pé","sets":[{"set_number":1,"reps":15,"weight":0},{"set_number":2,"reps":15,"weight":0},{"set_number":3,"reps":15,"weight":0}]}
  ]'::jsonb
);
