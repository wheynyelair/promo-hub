
-- 1. Restrict branch_settings read access
DROP POLICY IF EXISTS "anyone authenticated can read branch settings" ON public.branch_settings;
CREATE POLICY "branch members or admin can read branch settings"
ON public.branch_settings
FOR SELECT
TO authenticated
USING (is_admin() OR branch = current_branch());

-- 2. engagement_events: forbid null user_id
DELETE FROM public.engagement_events WHERE user_id IS NULL;
ALTER TABLE public.engagement_events ALTER COLUMN user_id SET NOT NULL;

-- 3. Revoke EXECUTE on SECURITY DEFINER helpers from clients (RLS still uses them)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.current_branch() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_lamina_counter() FROM anon, authenticated, public;

-- 4. Storage: drop broad SELECT policies that allow listing public buckets
DROP POLICY IF EXISTS "public read laminas files" ON storage.objects;
DROP POLICY IF EXISTS "branding bucket public read" ON storage.objects;
