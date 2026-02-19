
-- ============================================================
-- SECURITY HARDENING: trainer_students RPC-only access
-- (unique constraint already exists — skipped)
-- ============================================================

-- STEP 1: Drop the vulnerable INSERT policy
DROP POLICY IF EXISTS "Can insert trainer_students" ON public.trainer_students;

-- STEP 2: Create atomic, hardened accept_invitation_token RPC
CREATE OR REPLACE FUNCTION public.accept_invitation_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_id     uuid;
  v_invite         public.invitations%ROWTYPE;
  v_already_linked boolean;
BEGIN
  -- 1. Require authentication
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED: You must be logged in to accept an invitation.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Require student role (blocks trainers from self-linking or role confusion)
  IF NOT public.has_role(v_student_id, 'student'::app_role) THEN
    RAISE EXCEPTION 'NOT_STUDENT: Only users with the student role can accept invitations.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Lock the invitation row (FOR UPDATE prevents concurrent acceptance)
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE token = p_token
    AND used_by IS NULL
  FOR UPDATE;

  -- 4. Validate invitation exists and is unused
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_TOKEN: Invitation is invalid or has already been used.'
      USING ERRCODE = 'P0003';
  END IF;

  -- 5. Validate expiry
  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'EXPIRED_TOKEN: This invitation has expired.'
      USING ERRCODE = 'P0004';
  END IF;

  -- 6. Idempotency: if already linked, just clean up and return success
  SELECT EXISTS(
    SELECT 1 FROM public.trainer_students
    WHERE trainer_id = v_invite.trainer_id
      AND student_id = v_student_id
  ) INTO v_already_linked;

  IF v_already_linked THEN
    UPDATE public.invitations
    SET used_by = v_student_id,
        used_at = now()
    WHERE id = v_invite.id;

    RETURN jsonb_build_object(
      'success',       true,
      'trainer_id',    v_invite.trainer_id,
      'already_linked', true
    );
  END IF;

  -- 7. Insert trainer-student relationship (final race guard via ON CONFLICT)
  INSERT INTO public.trainer_students (trainer_id, student_id)
  VALUES (v_invite.trainer_id, v_student_id)
  ON CONFLICT (trainer_id, student_id) DO NOTHING;

  -- 8. Mark invitation as used (single-use enforcement)
  UPDATE public.invitations
  SET used_by = v_student_id,
      used_at  = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success',        true,
    'trainer_id',     v_invite.trainer_id,
    'already_linked', false
  );
END;
$$;

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION public.accept_invitation_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation_token(text) TO authenticated;
