-- Notify admins for EVERY new report, plus realtime publication
CREATE OR REPLACE FUNCTION public.tg_reports_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Notify every admin about the new report
  FOR _admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, actor_id, target_id)
    VALUES (_admin_id, 'report_new', NEW.reporter_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  IF _count >= 10 THEN
    UPDATE public.user_moderation
       SET under_supervision = true,
           supervision_since = COALESCE(supervision_since, now()),
           updated_at = now()
     WHERE user_id = NEW.target_user_id
       AND under_supervision = false;

    FOR _admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, actor_id, target_id)
      VALUES (_admin_id, 'report_supervision', NEW.reporter_id, NEW.target_user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Enable realtime on reports + notifications (idempotent)
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reports; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.reports REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;