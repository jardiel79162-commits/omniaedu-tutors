ALTER TABLE public.call_events
ADD COLUMN IF NOT EXISTS answer jsonb,
ADD COLUMN IF NOT EXISTS caller_ice jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recipient_ice jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.append_call_ice(_event_id uuid, _candidate jsonb, _side text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _side = 'caller' THEN
    UPDATE public.call_events
    SET caller_ice = COALESCE(caller_ice, '[]'::jsonb) || jsonb_build_array(_candidate)
    WHERE id = _event_id
      AND caller_id = _uid
      AND is_chat_member(chat_id, _uid);
  ELSIF _side = 'recipient' THEN
    UPDATE public.call_events
    SET recipient_ice = COALESCE(recipient_ice, '[]'::jsonb) || jsonb_build_array(_candidate)
    WHERE id = _event_id
      AND recipient_id = _uid
      AND is_chat_member(chat_id, _uid);
  ELSE
    RAISE EXCEPTION 'invalid side';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.append_call_ice(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_call_ice(uuid, jsonb, text) TO authenticated;