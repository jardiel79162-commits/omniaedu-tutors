CREATE TABLE public.contact_nicknames (
  owner_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  nickname text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, contact_id)
);

ALTER TABLE public.contact_nicknames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own nickname select" ON public.contact_nicknames
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "own nickname insert" ON public.contact_nicknames
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "own nickname update" ON public.contact_nicknames
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "own nickname delete" ON public.contact_nicknames
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER touch_contact_nicknames_updated_at
  BEFORE UPDATE ON public.contact_nicknames
  FOR EACH ROW EXECUTE FUNCTION public.touch_call_events_updated_at();