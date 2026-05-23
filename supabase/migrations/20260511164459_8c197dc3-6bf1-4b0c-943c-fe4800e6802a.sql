-- Branding table (single row)
CREATE TABLE public.branding_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  logo_url text,
  cover_url text,
  welcome_text text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.branding_settings (id) VALUES (true);

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branding read all auth" ON public.branding_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "branding admin write" ON public.branding_settings
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Public read also (for login page before auth)
CREATE POLICY "branding read public" ON public.branding_settings
  FOR SELECT TO anon USING (true);

-- Storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "branding bucket public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');

CREATE POLICY "branding bucket admin write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding' AND is_admin());

CREATE POLICY "branding bucket admin update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'branding' AND is_admin());

CREATE POLICY "branding bucket admin delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'branding' AND is_admin());