CREATE TABLE IF NOT EXISTS public.call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  caller_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('audio', 'video')),
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'declined', 'ended')),
  offer jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 seconds')
);

ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS call_events_recipient_status_idx ON public.call_events (recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS call_events_chat_idx ON public.call_events (chat_id, created_at DESC);

DROP POLICY IF EXISTS "call participants can view events" ON public.call_events;
CREATE POLICY "call participants can view events"
ON public.call_events
FOR SELECT
TO authenticated
USING (
  (auth.uid() = caller_id OR auth.uid() = recipient_id)
  AND public.is_chat_member(chat_id, auth.uid())
);

DROP POLICY IF EXISTS "members can start calls" ON public.call_events;
CREATE POLICY "members can start calls"
ON public.call_events
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = caller_id
  AND caller_id <> recipient_id
  AND public.is_chat_member(chat_id, caller_id)
  AND public.is_chat_member(chat_id, recipient_id)
);

DROP POLICY IF EXISTS "participants can update their calls" ON public.call_events;
CREATE POLICY "participants can update their calls"
ON public.call_events
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = caller_id OR auth.uid() = recipient_id)
  AND public.is_chat_member(chat_id, auth.uid())
)
WITH CHECK (
  (auth.uid() = caller_id OR auth.uid() = recipient_id)
  AND public.is_chat_member(chat_id, auth.uid())
);

CREATE OR REPLACE FUNCTION public.touch_call_events_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_call_events_updated_at ON public.call_events;
CREATE TRIGGER touch_call_events_updated_at
BEFORE UPDATE ON public.call_events
FOR EACH ROW
EXECUTE FUNCTION public.touch_call_events_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.call_events;