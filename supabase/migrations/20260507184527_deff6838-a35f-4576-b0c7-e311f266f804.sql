ALTER TABLE public.laminas ADD COLUMN IF NOT EXISTS industry text;
CREATE INDEX IF NOT EXISTS idx_laminas_industry ON public.laminas (industry);