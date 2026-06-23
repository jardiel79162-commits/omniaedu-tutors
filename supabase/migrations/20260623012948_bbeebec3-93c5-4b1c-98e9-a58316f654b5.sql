
-- Privacy toggles for followers / following lists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_followers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_following boolean NOT NULL DEFAULT false;

-- Helper: can _viewer see _owner's followers list?
CREATE OR REPLACE FUNCTION public.can_view_followers(_owner uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _owner = _viewer
      OR NOT COALESCE((SELECT hide_followers FROM public.profiles WHERE id = _owner), false);
$$;

CREATE OR REPLACE FUNCTION public.can_view_following(_owner uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _owner = _viewer
      OR NOT COALESCE((SELECT hide_following FROM public.profiles WHERE id = _owner), false);
$$;

-- Tighten the follows SELECT policy: a row is visible only when both
-- the followed user's hide_followers and the follower's hide_following allow it.
-- Owner / participant can always see their own rows.
DROP POLICY IF EXISTS "anyone can see follows" ON public.follows;
CREATE POLICY "follows visible respecting privacy"
  ON public.follows
  FOR SELECT
  USING (
    auth.uid() = follower_id
    OR auth.uid() = following_id
    OR (
      public.can_view_followers(following_id, auth.uid())
      AND public.can_view_following(follower_id, auth.uid())
    )
  );
