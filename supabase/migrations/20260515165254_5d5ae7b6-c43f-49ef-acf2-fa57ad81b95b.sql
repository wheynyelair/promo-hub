CREATE TABLE public.text_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch branch_code NOT NULL,
  branches branch_code[] NOT NULL DEFAULT '{}'::branch_code[],
  codprod text,
  ean text,
  description text NOT NULL,
  brand text,
  stock integer,
  price numeric(12,2),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_text_offers_branch ON public.text_offers(branch);
CREATE INDEX idx_text_offers_expires ON public.text_offers(expires_at);

ALTER TABLE public.text_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage text_offers"
ON public.text_offers
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "branch can view own text_offers"
ON public.text_offers
FOR SELECT
TO authenticated
USING (is_admin() OR current_branch() = ANY (branches) OR branch = current_branch());