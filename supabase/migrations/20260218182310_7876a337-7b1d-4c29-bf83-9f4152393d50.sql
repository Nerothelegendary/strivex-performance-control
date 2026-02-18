-- Add unique constraint on user_id to prevent duplicate roles
-- First clean up any remaining duplicates
DELETE FROM public.user_roles a USING public.user_roles b
WHERE a.id > b.id AND a.user_id = b.user_id;

-- Add unique constraint
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Fix: Drop restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);