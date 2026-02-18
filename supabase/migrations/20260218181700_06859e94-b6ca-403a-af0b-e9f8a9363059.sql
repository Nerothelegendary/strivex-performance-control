CREATE POLICY "Users can insert own roles"
ON public.user_roles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  role IN ('trainer', 'student')
);