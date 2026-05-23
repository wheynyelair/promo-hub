
-- Branches enum
CREATE TYPE public.branch_code AS ENUM ('filial01', 'filial02', 'filial03', 'admin');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  branch branch_code NOT NULL,
  display_name TEXT,
  phone TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.current_branch() RETURNS branch_code
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT branch FROM public.profiles WHERE id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
$$;

-- Laminas
CREATE TABLE public.laminas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch branch_code NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  badges TEXT[] NOT NULL DEFAULT '{}',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  download_count INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX ON public.laminas (branch, starts_at DESC);
ALTER TABLE public.laminas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branch can view own laminas" ON public.laminas FOR SELECT TO authenticated
  USING (public.is_admin() OR branch = public.current_branch());
CREATE POLICY "admin manage laminas" ON public.laminas FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Favorites
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lamina_id UUID NOT NULL REFERENCES public.laminas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lamina_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favs" ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Engagement events
CREATE TABLE public.engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lamina_id UUID NOT NULL REFERENCES public.laminas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','download','share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own events" ON public.engagement_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin read events" ON public.engagement_events FOR SELECT TO authenticated
  USING (public.is_admin());

-- Trigger to bump counters
CREATE OR REPLACE FUNCTION public.bump_lamina_counter() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.event_type = 'download' THEN
    UPDATE public.laminas SET download_count = download_count + 1 WHERE id = NEW.lamina_id;
  ELSIF NEW.event_type = 'share' THEN
    UPDATE public.laminas SET share_count = share_count + 1 WHERE id = NEW.lamina_id;
  ELSIF NEW.event_type = 'view' THEN
    UPDATE public.laminas SET view_count = view_count + 1 WHERE id = NEW.lamina_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_counter AFTER INSERT ON public.engagement_events
FOR EACH ROW EXECUTE FUNCTION public.bump_lamina_counter();

-- Storage bucket for laminas (public read)
INSERT INTO storage.buckets (id, name, public) VALUES ('laminas','laminas', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read laminas" ON storage.objects FOR SELECT
  USING (bucket_id = 'laminas');
CREATE POLICY "admin upload laminas" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'laminas' AND public.is_admin());
CREATE POLICY "admin update laminas" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'laminas' AND public.is_admin());
CREATE POLICY "admin delete laminas" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'laminas' AND public.is_admin());
