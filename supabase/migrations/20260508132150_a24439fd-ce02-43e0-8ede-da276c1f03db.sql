
ALTER TABLE public.laminas ADD COLUMN IF NOT EXISTS flash_until timestamptz;

CREATE TABLE IF NOT EXISTS public.branch_settings (
  branch branch_code PRIMARY KEY,
  manager_name text,
  manager_phone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branch_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authenticated can read branch settings"
ON public.branch_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin manage branch settings"
ON public.branch_settings FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO public.branch_settings (branch) VALUES ('filial01'), ('filial02'), ('filial03')
ON CONFLICT (branch) DO NOTHING;
