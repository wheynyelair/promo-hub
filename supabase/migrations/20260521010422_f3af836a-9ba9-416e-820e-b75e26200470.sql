
ALTER TABLE public.branch_settings
  ADD COLUMN IF NOT EXISTS gestor_nome text,
  ADD COLUMN IF NOT EXISTS gestor_telefone text,
  ADD COLUMN IF NOT EXISTS suporte_contato text;

CREATE TABLE IF NOT EXISTS public.price_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codfilial text NOT NULL,
  branch public.branch_code,
  codprod text NOT NULL,
  ean text,
  descricao text NOT NULL,
  departamento text,
  linha text,
  marca text,
  secao text,
  ptabela numeric,
  preco_final numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (codfilial, codprod)
);

CREATE INDEX IF NOT EXISTS idx_price_base_ean ON public.price_base(ean);
CREATE INDEX IF NOT EXISTS idx_price_base_codprod ON public.price_base(codprod);
CREATE INDEX IF NOT EXISTS idx_price_base_branch ON public.price_base(branch);

ALTER TABLE public.price_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage price_base"
  ON public.price_base FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "branch read own price_base"
  ON public.price_base FOR SELECT
  TO authenticated
  USING (public.is_admin() OR branch = public.current_branch());
