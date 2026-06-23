
-- Enums
CREATE TYPE public.report_target_type AS ENUM ('profile', 'post', 'message', 'comment');
CREATE TYPE public.report_reason AS ENUM ('spam_golpe', 'assedio_bullying', 'nudez', 'odio_violencia', 'automutilacao', 'outro');
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');

-- Reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target_type NOT NULL,
  target_id uuid NOT NULL,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  details text,
  status public.report_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_no_self CHECK (reporter_id <> target_user_id)
);

CREATE INDEX idx_reports_target_user ON public.reports(target_user_id);
CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

-- Moderation state
CREATE TABLE public.user_moderation (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reports_count int NOT NULL DEFAULT 0,
  under_supervision boolean NOT NULL DEFAULT false,
  supervision_since timestamptz,
  banned boolean NOT NULL DEFAULT false,
  banned_at timestamptz,
  banned_reason text,
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_moderation TO authenticated;
GRANT ALL ON public.user_moderation TO service_role;

ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all moderation"
  ON public.user_moderation FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Trigger to bump reports count + flag supervision
CREATE OR REPLACE FUNCTION public.tg_reports_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
  _admin_id uuid;
BEGIN
  INSERT INTO public.user_moderation (user_id, reports_count, updated_at)
  VALUES (NEW.target_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET reports_count = public.user_moderation.reports_count + 1,
        updated_at = now()
  RETURNING reports_count INTO _count;

  IF _count >= 10 THEN
    UPDATE public.user_moderation
       SET under_supervision = true,
           supervision_since = COALESCE(supervision_since, now()),
           updated_at = now()
     WHERE user_id = NEW.target_user_id
       AND under_supervision = false;

    -- Notify all admins
    FOR _admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, actor_id, target_id)
      VALUES (_admin_id, 'report_supervision', NEW.reporter_id, NEW.target_user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reports_after_insert
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.tg_reports_after_insert();

-- Helper: is user banned (used by app to redirect on login)
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT banned FROM public.user_moderation WHERE user_id = _user_id), false);
$$;
