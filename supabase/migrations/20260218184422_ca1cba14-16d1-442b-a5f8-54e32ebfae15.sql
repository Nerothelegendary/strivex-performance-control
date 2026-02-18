
-- Drop existing restrictive SELECT policies and replace with permissive ones
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.invitations;
DROP POLICY IF EXISTS "Trainers can read own invitations" ON public.invitations;

-- Permissive: anyone authenticated can read invitations (needed for token lookup)
CREATE POLICY "Anyone can read invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (true);

-- Trainers can still create invitations (keep existing)
-- Already exists: "Trainers can create invitations"

-- Allow authenticated users to update invitations (to mark as used)
CREATE POLICY "Users can mark invitation as used"
ON public.invitations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
