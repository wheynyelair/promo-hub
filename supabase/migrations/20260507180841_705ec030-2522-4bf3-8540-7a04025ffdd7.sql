
ALTER TABLE public.laminas ADD COLUMN IF NOT EXISTS branches public.branch_code[] NOT NULL DEFAULT '{}';

UPDATE public.laminas SET branches = ARRAY[branch]::public.branch_code[] WHERE array_length(branches,1) IS NULL;

DROP POLICY IF EXISTS "branch can view own laminas" ON public.laminas;
CREATE POLICY "branch can view own laminas"
ON public.laminas FOR SELECT
TO authenticated
USING (is_admin() OR (current_branch() = ANY(branches)) OR branch = current_branch());
