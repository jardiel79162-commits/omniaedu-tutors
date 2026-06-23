CREATE OR REPLACE FUNCTION public.ensure_direct_chat(_requester_id uuid, _addressee_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_chat uuid;
  new_chat_id uuid;
BEGIN
  SELECT c.id INTO existing_chat
  FROM public.chats c
  JOIN public.chat_members m1 ON m1.chat_id = c.id AND m1.user_id = _requester_id
  JOIN public.chat_members m2 ON m2.chat_id = c.id AND m2.user_id = _addressee_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF existing_chat IS NOT NULL THEN
    RETURN existing_chat;
  END IF;

  INSERT INTO public.chats (type, created_by)
  VALUES ('direct', _requester_id)
  RETURNING id INTO new_chat_id;

  INSERT INTO public.chat_members (chat_id, user_id, role)
  VALUES
    (new_chat_id, _requester_id, 'admin'),
    (new_chat_id, _addressee_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN new_chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_friendship_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();

  IF NEW.status = 'accepted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted') THEN
    PERFORM public.ensure_direct_chat(NEW.requester_id, NEW.addressee_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friendship_status_change ON public.friendships;
CREATE TRIGGER trg_friendship_status_change
BEFORE INSERT OR UPDATE OF status ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.on_friendship_status_change();

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT requester_id, addressee_id
    FROM public.friendships
    WHERE status = 'accepted'
  LOOP
    PERFORM public.ensure_direct_chat(f.requester_id, f.addressee_id);
  END LOOP;
END;
$$;