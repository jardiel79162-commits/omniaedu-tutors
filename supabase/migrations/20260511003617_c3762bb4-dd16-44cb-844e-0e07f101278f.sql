DROP POLICY IF EXISTS "members can view chat" ON public.chats;

CREATE POLICY "members or creator can view chat"
ON public.chats
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR public.is_chat_member(id, auth.uid())
);
