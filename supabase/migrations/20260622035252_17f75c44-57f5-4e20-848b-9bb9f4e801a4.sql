
CREATE TYPE public.security_severity AS ENUM ('info','low','medium','high','critical');

CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity public.security_severity NOT NULL DEFAULT 'low',
  risk_score int NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 200),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip text,
  user_agent text,
  route text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_events_created_at ON public.security_events (created_at DESC);
CREATE INDEX idx_security_events_severity ON public.security_events (severity, created_at DESC);
CREATE INDEX idx_security_events_type ON public.security_events (event_type, created_at DESC);
CREATE INDEX idx_security_events_user ON public.security_events (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all security events"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own security events"
  ON public.security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _severity public.security_severity DEFAULT 'low',
  _risk_score int DEFAULT 0,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _route text DEFAULT NULL,
  _message text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.security_events (event_type, severity, risk_score, user_id, ip, user_agent, route, message, metadata)
  VALUES (_event_type, _severity, GREATEST(0, LEAST(200, _risk_score)), auth.uid(), _ip, _user_agent, _route, _message, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_event(text, public.security_severity, int, text, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, public.security_severity, int, text, text, text, text, jsonb) TO authenticated, service_role;
