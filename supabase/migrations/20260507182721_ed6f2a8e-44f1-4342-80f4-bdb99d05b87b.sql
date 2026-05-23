CREATE TYPE public.lamina_category AS ENUM ('campanhas','acoes','compre_ganhe','diversos');
ALTER TABLE public.laminas ADD COLUMN category public.lamina_category NOT NULL DEFAULT 'diversos';