GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_branch() TO authenticated;

-- Keep trigger helper locked down; it is only executed by database triggers/admin operations.
REVOKE EXECUTE ON FUNCTION public.bump_lamina_counter() FROM PUBLIC, anon, authenticated;