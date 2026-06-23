
-- ============ SAVED POSTS / COLLECTIONS ============
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_private boolean NOT NULL DEFAULT true,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own collections read" ON public.collections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own collections insert" ON public.collections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own collections update" ON public.collections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own collections delete" ON public.collections FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.post_saves (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  collection_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_saves TO authenticated;
GRANT ALL ON public.post_saves TO service_role;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saves read" ON public.post_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saves insert" ON public.post_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saves update" ON public.post_saves FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saves delete" ON public.post_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_post_saves_collection ON public.post_saves(collection_id) WHERE collection_id IS NOT NULL;

-- ============ STATUS VIEWS ============
CREATE TABLE public.status_views (
  status_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (status_id, viewer_id)
);
GRANT SELECT, INSERT ON public.status_views TO authenticated;
GRANT ALL ON public.status_views TO service_role;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
-- Viewer can record their own view; owner of the status can see views
CREATE POLICY "viewer inserts view" ON public.status_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "viewer and owner read views" ON public.status_views FOR SELECT TO authenticated USING (
  auth.uid() = viewer_id
  OR EXISTS (SELECT 1 FROM public.statuses s WHERE s.id = status_views.status_id AND s.user_id = auth.uid())
);

-- ============ MESSAGE REACTIONS ============
CREATE TABLE public.message_reactions (
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read reactions" ON public.message_reactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = message_reactions.message_id AND public.is_chat_member(m.chat_id, auth.uid()))
);
CREATE POLICY "members add reactions" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = message_reactions.message_id AND public.is_chat_member(m.chat_id, auth.uid()))
);
CREATE POLICY "users update own reaction" ON public.message_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users remove own reaction" ON public.message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REPLY-TO IN MESSAGES ============
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_id uuid;
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON public.chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- ============ CHAT READ RECEIPTS ============
CREATE TABLE public.chat_reads (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_reads TO authenticated;
GRANT ALL ON public.chat_reads TO service_role;
ALTER TABLE public.chat_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read reads" ON public.chat_reads FOR SELECT TO authenticated USING (public.is_chat_member(chat_id, auth.uid()));
CREATE POLICY "users upsert own read" ON public.chat_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_chat_member(chat_id, auth.uid()));
CREATE POLICY "users update own read" ON public.chat_reads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ REELS AUDIO LIBRARY ============
CREATE TABLE public.audio_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid,
  title text NOT NULL,
  artist text,
  url text NOT NULL,
  duration_ms integer,
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audio_tracks TO anon;
GRANT SELECT, INSERT, UPDATE ON public.audio_tracks TO authenticated;
GRANT ALL ON public.audio_tracks TO service_role;
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audio public read" ON public.audio_tracks FOR SELECT USING (true);
CREATE POLICY "users add audio" ON public.audio_tracks FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS audio_track_id uuid;
CREATE INDEX IF NOT EXISTS idx_posts_audio ON public.posts(audio_track_id) WHERE audio_track_id IS NOT NULL;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_views;
