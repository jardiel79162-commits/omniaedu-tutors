
-- 1. Add short_code column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS short_code text UNIQUE;

-- 2. Function to generate a unique 6-digit code
CREATE OR REPLACE FUNCTION public.generate_unique_short_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
  tries int := 0;
BEGIN
  LOOP
    candidate := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
    PERFORM 1 FROM public.profiles WHERE short_code = candidate;
    IF NOT FOUND THEN RETURN candidate; END IF;
    tries := tries + 1;
    IF tries > 50 THEN RAISE EXCEPTION 'could not allocate short code'; END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_unique_short_code() FROM PUBLIC, anon, authenticated;

-- 3. Backfill existing rows
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE short_code IS NULL LOOP
    UPDATE public.profiles SET short_code = public.generate_unique_short_code() WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Update handle_new_user trigger to include short_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, short_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4)),
    public.generate_unique_short_code()
  );
  RETURN NEW;
END;
$$;

-- 5. Trigger to ensure any future insert without code gets one
CREATE OR REPLACE FUNCTION public.profiles_set_short_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := public.generate_unique_short_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_set_short_code ON public.profiles;
CREATE TRIGGER trg_profiles_set_short_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_set_short_code();
