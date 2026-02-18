
-- Tighten UPDATE policy: only allow marking invite as used by the accepting user
DROP POLICY IF EXISTS "Users can mark invitation as used" ON public.invitations;

CREATE POLICY "Users can mark invitation as used"
ON public.invitations
FOR UPDATE
TO authenticated
USING (used_by IS NULL)
WITH CHECK (used_by = auth.uid());
