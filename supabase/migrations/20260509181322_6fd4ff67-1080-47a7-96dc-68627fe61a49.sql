-- Extend profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS about text DEFAULT 'Disponível';

-- Allow any authenticated user to view profiles (for searching contacts)
DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "profiles viewable by authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Chats (direct or group)
CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('direct','group')),
  name text,
  avatar_url text,
  created_by uuid NOT NULL,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_members (
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user ON public.chat_members(user_id);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_chat ON public.chat_messages(chat_id, created_at);

CREATE TABLE public.statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text,
  media_url text,
  background text DEFAULT '#075E54',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_statuses_user ON public.statuses(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = _chat_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_chat_admin(_chat_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = _chat_id AND user_id = _user_id AND role = 'admin'
  )
$$;

-- chats policies
CREATE POLICY "members can view chat"
  ON public.chats FOR SELECT
  TO authenticated
  USING (public.is_chat_member(id, auth.uid()));

CREATE POLICY "any auth can create chat"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "admins can update chat"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (public.is_chat_admin(id, auth.uid()) OR auth.uid() = created_by);

CREATE POLICY "creator can delete chat"
  ON public.chats FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- chat_members policies
CREATE POLICY "members see own membership rows"
  ON public.chat_members FOR SELECT
  TO authenticated
  USING (public.is_chat_member(chat_id, auth.uid()));

CREATE POLICY "creator/admin add members"
  ON public.chat_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- bootstrap: creator inserts themselves on chat creation
    (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.created_by = auth.uid()))
    OR public.is_chat_admin(chat_id, auth.uid())
  );

CREATE POLICY "admins remove members or self leave"
  ON public.chat_members FOR DELETE
  TO authenticated
  USING (public.is_chat_admin(chat_id, auth.uid()) OR user_id = auth.uid());

-- chat_messages policies
CREATE POLICY "members read messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (public.is_chat_member(chat_id, auth.uid()));

CREATE POLICY "members send messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_chat_member(chat_id, auth.uid()));

CREATE POLICY "sender deletes own message"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- statuses policies
CREATE POLICY "auth users view non-expired statuses"
  ON public.statuses FOR SELECT
  TO authenticated
  USING (expires_at > now());

CREATE POLICY "users post own status"
  ON public.statuses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own status"
  ON public.statuses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger: when a message is inserted, update chat last_message
CREATE OR REPLACE FUNCTION public.touch_chat_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chats
    SET last_message = NEW.content, last_message_at = NEW.created_at
    WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_chat_last_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_chat_last_message();

-- Update handle_new_user to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;