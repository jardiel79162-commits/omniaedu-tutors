
-- Tabela de usernames reservados
CREATE TABLE public.reserved_usernames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  username_lower text GENERATED ALWAYS AS (lower(username)) STORED,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (username_lower)
);

CREATE INDEX idx_reserved_usernames_user ON public.reserved_usernames(user_id);
CREATE INDEX idx_reserved_usernames_expires ON public.reserved_usernames(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reserved_usernames TO authenticated;
GRANT ALL ON public.reserved_usernames TO service_role;

ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reservations"
  ON public.reserved_usernames FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages reservations"
  ON public.reserved_usernames FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_reserved_usernames_updated
  BEFORE UPDATE ON public.reserved_usernames
  FOR EACH ROW EXECUTE FUNCTION public.tg_plan_limits_updated_at();

-- Verifica se username está disponível
CREATE OR REPLACE FUNCTION public.is_username_available(_username text, _for_user uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _u text := lower(trim(_username));
BEGIN
  IF _u IS NULL OR length(_u) < 2 THEN RETURN false; END IF;

  -- já em uso por outro profile?
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = _u
      AND (_for_user IS NULL OR id <> _for_user)
  ) THEN RETURN false; END IF;

  -- reservado por outro usuário e ainda dentro do prazo?
  IF EXISTS (
    SELECT 1 FROM public.reserved_usernames
    WHERE username_lower = _u
      AND (_for_user IS NULL OR user_id <> _for_user)
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN RETURN false; END IF;

  RETURN true;
END;
$$;

-- Reserva username (PLUS, max 3)
CREATE OR REPLACE FUNCTION public.reserve_username(_username text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _u text := lower(trim(_username));
  _count int;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.is_plus_user(_uid) THEN
    RAISE EXCEPTION 'only PLUS users can reserve usernames';
  END IF;
  IF _u IS NULL OR length(_u) < 2 OR length(_u) > 30 THEN
    RAISE EXCEPTION 'invalid username';
  END IF;
  IF _u !~ '^[a-z0-9_\.]+$' THEN
    RAISE EXCEPTION 'username may only contain letters, numbers, _ and .';
  END IF;

  SELECT count(*) INTO _count FROM public.reserved_usernames WHERE user_id = _uid;
  IF _count >= 3 THEN
    RAISE EXCEPTION 'maximum of 3 reserved usernames reached';
  END IF;

  IF NOT public.is_username_available(_u, _uid) THEN
    RAISE EXCEPTION 'username not available';
  END IF;

  INSERT INTO public.reserved_usernames (user_id, username, expires_at)
  VALUES (_uid, _u, NULL)
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

-- Remove reserva
CREATE OR REPLACE FUNCTION public.release_username_reservation(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM public.reserved_usernames WHERE id = _id AND user_id = _uid;
END;
$$;

-- Quando PLUS expira, marca reservas com expires_at = now() + 90 dias
-- Quando volta a PLUS, limpa expires_at
CREATE OR REPLACE FUNCTION public.tg_sync_username_reservations_on_plus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := COALESCE(NEW.user_id, OLD.user_id);
  _active boolean;
BEGIN
  SELECT public.is_plus_user(_uid) INTO _active;

  IF _active THEN
    -- volta a ser PLUS: reativa reservas que ainda não expiraram completamente
    UPDATE public.reserved_usernames
       SET expires_at = NULL
     WHERE user_id = _uid
       AND (expires_at IS NULL OR expires_at > now());
  ELSE
    -- perdeu PLUS: dá 90 dias de bloqueio antes de liberar
    UPDATE public.reserved_usernames
       SET expires_at = now() + interval '90 days'
     WHERE user_id = _uid
       AND expires_at IS NULL;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_username_reservations ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_username_reservations
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_username_reservations_on_plus();
