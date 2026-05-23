ALTER TABLE public.laminas
  ADD COLUMN IF NOT EXISTS ean text,
  ADD COLUMN IF NOT EXISTS price_from numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_to numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_laminas_ean ON public.laminas(ean);