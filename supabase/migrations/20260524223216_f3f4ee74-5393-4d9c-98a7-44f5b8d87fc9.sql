
-- Make the realtime topic policy tolerant to extra suffixes (e.g., call-{chat}-{user}-{ts}).
DROP POLICY IF EXISTS "members subscribe to chat topics" ON realtime.messages;
CREATE POLICY "members subscribe to chat topics" ON realtime.messages
FOR SELECT TO authenticated
USING (
  CASE
    WHEN topic LIKE 'chat-%' THEN
      public.is_chat_member(
        NULLIF(substring(topic from 'chat-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), '')::uuid,
        auth.uid()
      )
    WHEN topic LIKE 'call-events-%' THEN
      substring(topic from 13) = auth.uid()::text
    WHEN topic LIKE 'call-%' THEN
      public.is_chat_member(
        NULLIF(substring(topic from 'call-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'), '')::uuid,
        auth.uid()
      )
    ELSE true
  END
);
