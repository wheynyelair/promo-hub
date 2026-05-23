
-- Fix privilege escalation: prevent users from changing is_admin/branch on their own profile
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
    AND branch   = (SELECT p.branch   FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Lock down SECURITY DEFINER helpers from direct user execution.
-- is_admin() and current_branch() are still usable in RLS policy evaluation
-- because policies run with the table owner's privileges, but direct RPC
-- calls from clients are no longer allowed.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_branch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_lamina_counter() FROM PUBLIC, anon, authenticated;
