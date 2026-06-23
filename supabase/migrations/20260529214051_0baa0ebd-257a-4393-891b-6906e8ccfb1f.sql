
-- ============ PROFILES counters ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts_count integer NOT NULL DEFAULT 0;

-- ============ FOLLOWS ============
CREATE TABLE public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can see follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "users follow as themselves" ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "users unfollow themselves" ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

CREATE OR REPLACE FUNCTION public.on_follow_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    INSERT INTO public.notifications (user_id, type, actor_id, target_id)
      VALUES (NEW.following_id, 'follow', NEW.follower_id, NEW.follower_id)
      ON CONFLICT DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

-- ============ POSTS ============
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'photo' CHECK (kind IN ('photo','reel')),
  caption text NOT NULL DEFAULT '',
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_author_created ON public.posts(author_id, created_at DESC);
CREATE INDEX idx_posts_kind_created ON public.posts(kind, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts public read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "author insert post" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "author update post" ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "author delete post" ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE OR REPLACE FUNCTION public.on_post_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = OLD.author_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_post_count AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.on_post_change();

-- ============ POST MEDIA ============
CREATE TABLE public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  mime text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  width integer,
  height integer,
  duration_ms integer
);
CREATE INDEX idx_post_media_post ON public.post_media(post_id, position);

GRANT SELECT, INSERT, DELETE ON public.post_media TO authenticated;
GRANT SELECT ON public.post_media TO anon;
GRANT ALL ON public.post_media TO service_role;

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media public read" ON public.post_media FOR SELECT USING (true);
CREATE POLICY "author insert media" ON public.post_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));
CREATE POLICY "author delete media" ON public.post_media FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

-- ============ POST LIKES ============
CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX idx_post_likes_user ON public.post_likes(user_id);

GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT SELECT ON public.post_likes TO anon;
GRANT ALL ON public.post_likes TO service_role;

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes public read" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "user likes" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user unlikes" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.on_post_like_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id RETURNING author_id INTO _author;
    IF _author IS NOT NULL AND _author <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, actor_id, target_id)
      VALUES (_author, 'like', NEW.user_id, NEW.post_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_like_count AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.on_post_like_change();

-- ============ POST COMMENTS ============
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post ON public.post_comments(post_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT SELECT ON public.post_comments TO anon;
GRANT ALL ON public.post_comments TO service_role;

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments public read" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "user comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user deletes own comment" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.on_comment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id RETURNING author_id INTO _author;
    IF _author IS NOT NULL AND _author <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, actor_id, target_id)
      VALUES (_author, 'comment', NEW.user_id, NEW.post_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_comment_count AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.on_comment_change();

-- ============ HASHTAGS ============
CREATE TABLE public.hashtags (
  tag text PRIMARY KEY,
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.hashtags TO authenticated;
GRANT SELECT ON public.hashtags TO anon;
GRANT ALL ON public.hashtags TO service_role;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags public read" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "tags insert auth" ON public.hashtags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tags update auth" ON public.hashtags FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.post_hashtags (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag text NOT NULL,
  PRIMARY KEY (post_id, tag)
);
CREATE INDEX idx_post_hashtags_tag ON public.post_hashtags(tag);
GRANT SELECT, INSERT, DELETE ON public.post_hashtags TO authenticated;
GRANT SELECT ON public.post_hashtags TO anon;
GRANT ALL ON public.post_hashtags TO service_role;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph public read" ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "ph author insert" ON public.post_hashtags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));
CREATE POLICY "ph author delete" ON public.post_hashtags FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('follow','like','comment','mention','conv_request','conv_accept')),
  actor_id uuid,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifs_user_created ON public.notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX uq_notifs_follow ON public.notifications(user_id, type, actor_id)
  WHERE type = 'follow';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifs read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifs update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notifs delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- inserts come from triggers (security definer) — no direct INSERT policy needed.

-- Now safe to attach follow trigger (uses notifications)
CREATE TRIGGER trg_follow_change AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.on_follow_change();

-- ============ CONVERSATION REQUESTS ============
CREATE TABLE public.conversation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL,
  to_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_id <> to_id),
  UNIQUE (from_id, to_id)
);
CREATE INDEX idx_conv_req_to ON public.conversation_requests(to_id, status);
CREATE INDEX idx_conv_req_from ON public.conversation_requests(from_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_requests TO authenticated;
GRANT ALL ON public.conversation_requests TO service_role;
ALTER TABLE public.conversation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "see own conv req" ON public.conversation_requests FOR SELECT TO authenticated
  USING (auth.uid() = from_id OR auth.uid() = to_id);
CREATE POLICY "send conv req" ON public.conversation_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_id AND status = 'pending');
CREATE POLICY "respond conv req" ON public.conversation_requests FOR UPDATE TO authenticated
  USING (auth.uid() = to_id) WITH CHECK (auth.uid() = to_id AND status IN ('accepted','rejected'));
CREATE POLICY "cancel conv req" ON public.conversation_requests FOR DELETE TO authenticated
  USING (auth.uid() = from_id OR auth.uid() = to_id);

CREATE OR REPLACE FUNCTION public.on_conv_request_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, actor_id, target_id)
      VALUES (NEW.to_id, 'conv_request', NEW.from_id, NEW.id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    PERFORM public.ensure_direct_chat(NEW.from_id, NEW.to_id);
    INSERT INTO public.notifications (user_id, type, actor_id, target_id)
      VALUES (NEW.from_id, 'conv_accept', NEW.to_id, NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_conv_req_iu BEFORE INSERT OR UPDATE ON public.conversation_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_conv_request_change();

-- ============ STORAGE BUCKET (posts-media, public read) ============
INSERT INTO storage.buckets (id, name, public)
  VALUES ('posts-media', 'posts-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "posts media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'posts-media');
CREATE POLICY "posts media owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'posts-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "posts media owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'posts-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_requests;
