
-- 1) Tighten posts SELECT policy: respect visibility
DROP POLICY IF EXISTS "posts public read" ON public.posts;

CREATE POLICY "posts public read"
ON public.posts
FOR SELECT
TO anon
USING (COALESCE(visibility, 'public') = 'public');

CREATE POLICY "posts auth read"
ON public.posts
FOR SELECT
TO authenticated
USING (
  COALESCE(visibility, 'public') = 'public'
  OR author_id = auth.uid()
  OR (
    visibility = 'followers'
    AND EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = auth.uid() AND f.following_id = posts.author_id
    )
  )
);

-- 2) Remove membership-bypass storage policies
DROP POLICY IF EXISTS "users upload own chat-media" ON storage.objects;
DROP POLICY IF EXISTS "voice msgs auth upload" ON storage.objects;

-- 3) Restrict realtime call-page topic to the addressed user only
DROP POLICY IF EXISTS "members subscribe to chat topics" ON realtime.messages;
CREATE POLICY "members subscribe to chat topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN topic LIKE 'chat-%' THEN public.is_chat_member((NULLIF(substring(topic, 'chat-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), ''))::uuid, auth.uid())
    WHEN topic LIKE 'call-events-%' THEN substring(topic FROM 13) = (auth.uid())::text
    WHEN topic LIKE 'call-notify-%' THEN public.is_chat_member((NULLIF(substring(topic, 'call-notify-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), ''))::uuid, auth.uid())
    WHEN topic LIKE 'call-signal-%' THEN public.is_chat_member((NULLIF(substring(topic, 'call-signal-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), ''))::uuid, auth.uid())
    WHEN topic LIKE 'call-page-%' THEN substring(topic FROM 11) = (auth.uid())::text
    WHEN topic LIKE 'call-%' THEN public.is_chat_member((NULLIF(substring(topic, 'call-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), ''))::uuid, auth.uid())
    ELSE false
  END
);
