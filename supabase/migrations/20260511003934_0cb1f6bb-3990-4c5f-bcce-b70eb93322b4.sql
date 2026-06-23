-- Friendship status enum
DO $$ BEGIN
  CREATE TYPE public.friendship_status AS ENUM ('pending','accepted','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id, status);
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "see own friendships"
ON public.friendships FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "send friend request"
ON public.friendships FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND status = 'pending'
  AND requester_id <> addressee_id
);

CREATE POLICY "respond friend request"
ON public.friendships FOR UPDATE TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (auth.uid() = addressee_id AND status IN ('accepted','rejected'));

CREATE POLICY "cancel own request"
ON public.friendships FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Trigger: when accepted, ensure a direct chat exists between both users
CREATE OR REPLACE FUNCTION public.on_friendship_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_chat uuid;
  new_chat_id uuid;
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    SELECT c.id INTO existing_chat
    FROM public.chats c
    JOIN public.chat_members m1 ON m1.chat_id = c.id AND m1.user_id = NEW.requester_id
    JOIN public.chat_members m2 ON m2.chat_id = c.id AND m2.user_id = NEW.addressee_id
    WHERE c.type = 'direct'
    LIMIT 1;

    IF existing_chat IS NULL THEN
      INSERT INTO public.chats (type, created_by) VALUES ('direct', NEW.requester_id) RETURNING id INTO new_chat_id;
      INSERT INTO public.chat_members (chat_id, user_id, role) VALUES (new_chat_id, NEW.requester_id, 'admin');
      INSERT INTO public.chat_members (chat_id, user_id, role) VALUES (new_chat_id, NEW.addressee_id, 'member');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_friendship_status_change
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.on_friendship_status_change();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
