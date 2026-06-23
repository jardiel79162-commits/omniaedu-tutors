GRANT SELECT, INSERT, UPDATE ON public.chat_reads TO authenticated;
GRANT ALL ON public.chat_reads TO service_role;

DROP POLICY IF EXISTS "users update own read" ON public.chat_reads;
CREATE POLICY "users update own member read"
ON public.chat_reads
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_chat_member(chat_id, auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_chat_member(chat_id, auth.uid()));