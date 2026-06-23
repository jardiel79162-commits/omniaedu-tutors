-- Grant execute on chat helper functions to authenticated role
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_admin(uuid, uuid) TO authenticated;

-- Helper: do two users share at least one chat?
CREATE OR REPLACE FUNCTION public.shares_chat_with(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_members m1
    JOIN public.chat_members m2 ON m1.chat_id = m2.chat_id
    WHERE m1.user_id = _a AND m2.user_id = _b
  )
$$;

GRANT EXECUTE ON FUNCTION public.shares_chat_with(uuid, uuid) TO authenticated;

-- Update statuses SELECT policy: only own status or status of contacts
DROP POLICY IF EXISTS "auth users view non-expired statuses" ON public.statuses;

CREATE POLICY "view own or contacts statuses"
ON public.statuses
FOR SELECT
TO authenticated
USING (
  expires_at > now()
  AND (
    user_id = auth.uid()
    OR public.shares_chat_with(auth.uid(), user_id)
  )
);
