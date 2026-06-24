
-- ============ COLUMNS EXISTENTES ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plus_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'post';
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;
ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS background text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- ============ COLLECTIONS / POST_SAVES ============
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_self_all" ON public.collections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.post_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id, collection_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_saves TO authenticated;
GRANT ALL ON public.post_saves TO service_role;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_saves_self_all" ON public.post_saves FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ CALL EVENTS ============
CREATE TABLE IF NOT EXISTS public.call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'voice',
  status text NOT NULL DEFAULT 'ringing',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS call_events_chat_idx ON public.call_events(chat_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.call_events TO authenticated;
GRANT ALL ON public.call_events TO service_role;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "call_events_member_read" ON public.call_events FOR SELECT TO authenticated
  USING (public.is_chat_member(chat_id, auth.uid()));
CREATE POLICY "call_events_member_insert" ON public.call_events FOR INSERT TO authenticated
  WITH CHECK (caller_id = auth.uid() AND public.is_chat_member(chat_id, auth.uid()));
CREATE POLICY "call_events_member_update" ON public.call_events FOR UPDATE TO authenticated
  USING (public.is_chat_member(chat_id, auth.uid()));

-- ============ STATUS VIEWS ============
CREATE TABLE IF NOT EXISTS public.status_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (status_id, viewer_id)
);
GRANT SELECT, INSERT ON public.status_views TO authenticated;
GRANT ALL ON public.status_views TO service_role;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_views_self_or_owner_read" ON public.status_views FOR SELECT TO authenticated
  USING (
    viewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.statuses s WHERE s.id = status_id AND s.user_id = auth.uid())
  );
CREATE POLICY "status_views_self_insert" ON public.status_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- ============ CONTACT NICKNAMES ============
CREATE TABLE IF NOT EXISTS public.contact_nicknames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, contact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_nicknames TO authenticated;
GRANT ALL ON public.contact_nicknames TO service_role;
ALTER TABLE public.contact_nicknames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_nicknames_self_all" ON public.contact_nicknames FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ============ CREATOR REWARDS ============
CREATE TABLE IF NOT EXISTS public.creator_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier bigint NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tier)
);
GRANT SELECT ON public.creator_rewards TO authenticated;
GRANT ALL ON public.creator_rewards TO service_role;
ALTER TABLE public.creator_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_rewards_read_all" ON public.creator_rewards FOR SELECT TO authenticated USING (true);

-- ============ RESERVED USERNAMES ============
CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.reserved_usernames TO authenticated;
GRANT ALL ON public.reserved_usernames TO service_role;
ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reserved_usernames_self_read" ON public.reserved_usernames FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_username_available(_username text, _for_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_username) AND id <> _for_user)
    AND NOT EXISTS (
      SELECT 1 FROM public.reserved_usernames
      WHERE lower(username) = lower(_username)
        AND user_id <> _for_user
        AND (expires_at IS NULL OR expires_at > now())
    )
$$;

CREATE OR REPLACE FUNCTION public.reserve_username(_username text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; u text;
BEGIN
  u := lower(trim(_username));
  IF u IS NULL OR length(u) < 2 THEN RAISE EXCEPTION 'invalid_username'; END IF;
  IF NOT public.is_username_available(u, auth.uid()) THEN RAISE EXCEPTION 'username_taken'; END IF;
  INSERT INTO public.reserved_usernames (user_id, username, expires_at)
  VALUES (auth.uid(), u, now() + interval '30 days')
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_username_reservation(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.reserved_usernames WHERE id = _id AND user_id = auth.uid();
END;
$$;

-- ============ USER MODERATION ============
CREATE TABLE IF NOT EXISTS public.user_moderation (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reports_count integer NOT NULL DEFAULT 0,
  under_supervision boolean NOT NULL DEFAULT false,
  supervised_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  supervised_at timestamptz,
  supervised_until timestamptz,
  banned boolean NOT NULL DEFAULT false,
  banned_at timestamptz,
  banned_reason text,
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_moderation TO authenticated;
GRANT ALL ON public.user_moderation TO service_role;
ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_moderation_self_read" ON public.user_moderation FOR SELECT TO authenticated
  USING (user_id = auth.uid());
