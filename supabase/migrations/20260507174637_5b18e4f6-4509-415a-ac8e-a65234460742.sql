
REVOKE EXECUTE ON FUNCTION public.current_branch() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bump_lamina_counter() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.current_branch() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Replace overly broad public select on storage.objects with one that doesn't enable listing arbitrarily
DROP POLICY IF EXISTS "public read laminas" ON storage.objects;
CREATE POLICY "public read laminas files" ON storage.objects FOR SELECT
  USING (bucket_id = 'laminas' AND name LIKE '%/%');
