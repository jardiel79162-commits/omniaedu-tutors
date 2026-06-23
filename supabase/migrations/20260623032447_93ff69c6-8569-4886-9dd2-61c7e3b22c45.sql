DROP POLICY IF EXISTS "follows visible respecting privacy" ON public.follows;
CREATE POLICY "follows visible respecting privacy" ON public.follows
FOR SELECT
USING (
  auth.uid() = follower_id
  OR auth.uid() = following_id
  OR public.can_view_followers(following_id, auth.uid())
  OR public.can_view_following(follower_id, auth.uid())
);