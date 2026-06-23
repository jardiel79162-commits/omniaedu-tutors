
-- 1) Add is_plus column to profiles (verified badge gate)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_plus boolean NOT NULL DEFAULT false;

-- 2) Function to recompute is_plus for a given user
CREATE OR REPLACE FUNCTION public.sync_profile_is_plus(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.plan = 'plus'
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ) INTO active;

  UPDATE public.profiles SET is_plus = COALESCE(active, false) WHERE id = _user_id;
END;
$$;

-- 3) Trigger on subscriptions to keep profiles.is_plus in sync
CREATE OR REPLACE FUNCTION public.tg_subscriptions_sync_plus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_profile_is_plus(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.sync_profile_is_plus(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_sync_plus ON public.subscriptions;
CREATE TRIGGER subscriptions_sync_plus
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_subscriptions_sync_plus();

-- 4) Backfill existing rows
UPDATE public.profiles p
SET is_plus = EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.user_id = p.id
    AND s.plan = 'plus'
    AND s.status = 'active'
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
);

-- 5) Grants: server (service_role) needs write on subscriptions to record payments
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO service_role;
