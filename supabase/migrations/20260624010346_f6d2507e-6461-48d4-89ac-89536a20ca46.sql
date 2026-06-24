
-- hashtags ranking
CREATE TABLE IF NOT EXISTS public.hashtags (
  tag text PRIMARY KEY,
  uses_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.hashtags TO authenticated;
GRANT ALL ON public.hashtags TO service_role;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hashtags_read_all" ON public.hashtags FOR SELECT TO authenticated USING (true);
CREATE POLICY "hashtags_upsert" ON public.hashtags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hashtags_update" ON public.hashtags FOR UPDATE TO authenticated USING (true);

-- rename post_hashtags.hashtag -> tag
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='post_hashtags' AND column_name='hashtag') THEN
    ALTER TABLE public.post_hashtags RENAME COLUMN hashtag TO tag;
  END IF;
END $$;
DROP INDEX IF EXISTS post_hashtags_tag_idx;
CREATE INDEX IF NOT EXISTS post_hashtags_tag_idx ON public.post_hashtags(tag);

-- chats bio
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS bio text;

-- notifications updates
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;
