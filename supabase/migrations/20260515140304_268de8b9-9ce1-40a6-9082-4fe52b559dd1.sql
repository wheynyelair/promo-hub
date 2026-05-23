
-- Restore EXECUTE on helpers used inside RLS policies.
-- Without this, every SELECT on laminas/branch_settings fails with
-- "permission denied for function current_branch".
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_branch() TO authenticated;
