REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_branch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_lamina_counter() FROM PUBLIC, anon, authenticated;