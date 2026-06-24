
-- ============ COLUMNS ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS about text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS duration_ms integer;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS mp_payment_id text;

-- ============ CHAT READS ============
CREATE TABLE IF NOT EXISTS public.chat_reads (
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_reads TO authenticated;
GRANT ALL ON public.chat_reads TO service_role;
ALTER TABLE public.chat_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_reads_self_all" ON public.chat_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ FRIENDSHIPS ============
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_either_side_read" ON public.friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friendships_requester_insert" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "friendships_either_update" ON public.friendships FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friendships_either_delete" ON public.friendships FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- ============ CONVERSATION REQUESTS ============
CREATE TABLE IF NOT EXISTS public.conversation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_id <> to_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_requests TO authenticated;
GRANT ALL ON public.conversation_requests TO service_role;
ALTER TABLE public.conversation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "convreq_either_read" ON public.conversation_requests FOR SELECT TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY "convreq_from_insert" ON public.conversation_requests FOR INSERT TO authenticated
  WITH CHECK (from_id = auth.uid());
CREATE POLICY "convreq_either_update" ON public.conversation_requests FOR UPDATE TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY "convreq_either_delete" ON public.conversation_requests FOR DELETE TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());

-- ============ POST MEDIA / HASHTAGS / PRODUCT LINKS ============
CREATE TABLE IF NOT EXISTS public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  mime text NOT NULL DEFAULT 'image/jpeg',
  position integer NOT NULL DEFAULT 0,
  width integer,
  height integer,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_media_post_idx ON public.post_media(post_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_media TO authenticated;
GRANT ALL ON public.post_media TO service_role;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_media_read_all" ON public.post_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_media_owner_write" ON public.post_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.post_hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, hashtag)
);
CREATE INDEX IF NOT EXISTS post_hashtags_tag_idx ON public.post_hashtags(hashtag);
GRANT SELECT, INSERT, DELETE ON public.post_hashtags TO authenticated;
GRANT ALL ON public.post_hashtags TO service_role;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_hashtags_read_all" ON public.post_hashtags FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_hashtags_owner_write" ON public.post_hashtags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_position integer NOT NULL DEFAULT 0,
  url text NOT NULL,
  label text,
  logo_url text,
  x double precision NOT NULL DEFAULT 0.5,
  y double precision NOT NULL DEFAULT 0.5,
  size double precision NOT NULL DEFAULT 0.2,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_links TO authenticated;
GRANT ALL ON public.product_links TO service_role;
ALTER TABLE public.product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_links_read_all" ON public.product_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_links_owner_write" ON public.product_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

-- ============ SECURITY EVENTS ============
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  risk_score integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip text,
  route text,
  user_agent text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_severity_idx ON public.security_events(severity);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_events_admin_read" ON public.security_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _severity text DEFAULT 'low',
  _risk_score integer DEFAULT 0,
  _route text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _message text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.security_events (event_type, severity, risk_score, user_id, route, user_agent, message, metadata)
  VALUES (_event_type, COALESCE(_severity,'low'), COALESCE(_risk_score,0), auth.uid(), _route, _user_agent, _message, COALESCE(_metadata,'{}'::jsonb));
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_security_event(text,text,integer,text,text,text,jsonb) TO authenticated;
