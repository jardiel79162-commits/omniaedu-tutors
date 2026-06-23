
-- 1) Tabela de conquistas
CREATE TABLE IF NOT EXISTS public.creator_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier integer NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_creator_rewards_user ON public.creator_rewards(user_id);

GRANT SELECT ON public.creator_rewards TO authenticated;
GRANT ALL ON public.creator_rewards TO service_role;

ALTER TABLE public.creator_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_rewards_select_all_auth" ON public.creator_rewards;
CREATE POLICY "creator_rewards_select_all_auth"
  ON public.creator_rewards FOR SELECT
  TO authenticated
  USING (true);

-- 2) Função que concede tiers ao atualizar followers_count
CREATE OR REPLACE FUNCTION public.tg_award_creator_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tiers int[] := ARRAY[100000, 500000, 1000000, 5000000, 10000000];
  t int;
BEGIN
  IF NEW.followers_count IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.followers_count,0) >= COALESCE(NEW.followers_count,0) THEN
    RETURN NEW;
  END IF;

  FOREACH t IN ARRAY tiers LOOP
    IF NEW.followers_count >= t AND COALESCE(OLD.followers_count, 0) < t THEN
      INSERT INTO public.creator_rewards (user_id, tier)
      VALUES (NEW.id, t)
      ON CONFLICT (user_id, tier) DO NOTHING;

      INSERT INTO public.notifications (user_id, type, actor_id, target_id)
      VALUES (NEW.id, 'creator_reward', NEW.id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_creator_rewards ON public.profiles;
CREATE TRIGGER trg_award_creator_rewards
AFTER INSERT OR UPDATE OF followers_count ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.tg_award_creator_rewards();

-- 3) Backfill: concede tiers para quem já está acima do limiar
INSERT INTO public.creator_rewards (user_id, tier)
SELECT p.id, t.tier
FROM public.profiles p
CROSS JOIN (VALUES (100000),(500000),(1000000),(5000000),(10000000)) AS t(tier)
WHERE p.followers_count >= t.tier
ON CONFLICT (user_id, tier) DO NOTHING;
