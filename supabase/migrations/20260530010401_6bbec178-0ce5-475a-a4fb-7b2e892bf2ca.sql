-- Allow followers to view stories (in addition to chat-mates and self)
CREATE POLICY "followers view statuses"
ON public.statuses
FOR SELECT
TO authenticated
USING (
  expires_at > now()
  AND EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.follower_id = auth.uid() AND f.following_id = statuses.user_id
  )
);

-- Make sure status_views replicates fully for realtime if needed
ALTER TABLE public.status_views REPLICA IDENTITY FULL;