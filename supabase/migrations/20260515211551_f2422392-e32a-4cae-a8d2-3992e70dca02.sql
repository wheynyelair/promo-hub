ALTER TABLE public.text_offers
  ADD COLUMN title text,
  ADD COLUMN flash_until timestamp with time zone;