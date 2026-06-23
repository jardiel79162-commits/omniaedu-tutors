import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, Crown, Diamond, Gem, Star } from "lucide-react";

export const REWARD_TIERS = [
  { tier: 100000,   label: "100K",  name: "Criador Bronze",   icon: Award,   color: "text-amber-600",  bg: "bg-amber-500/10",  ring: "ring-amber-500/40" },
  { tier: 500000,   label: "500K",  name: "Criador Prata",    icon: Star,    color: "text-slate-300",  bg: "bg-slate-400/10",  ring: "ring-slate-400/40" },
  { tier: 1000000,  label: "1M",    name: "Criador Ouro",     icon: Crown,   color: "text-yellow-400", bg: "bg-yellow-500/10", ring: "ring-yellow-400/50" },
  { tier: 5000000,  label: "5M",    name: "Criador Diamante", icon: Diamond, color: "text-sky-400",    bg: "bg-sky-500/10",    ring: "ring-sky-400/50" },
  { tier: 10000000, label: "10M",   name: "Lenda JTC",        icon: Gem,     color: "text-fuchsia-400",bg: "bg-fuchsia-500/10",ring: "ring-fuchsia-400/50" },
] as const;

export function tierMeta(tier: number) {
  return REWARD_TIERS.find((t) => t.tier === tier);
}

export function useCreatorRewards(userId?: string) {
  const [tiers, setTiers] = useState<number[]>([]);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("creator_rewards")
        .select("tier")
        .eq("user_id", userId)
        .order("tier", { ascending: true });
      if (alive) setTiers((data ?? []).map((r: any) => r.tier as number));
    })();
    return () => { alive = false; };
  }, [userId]);
  return tiers;
}

export function CreatorRewardsRow({ userId, compact = false }: { userId?: string; compact?: boolean }) {
  const tiers = useCreatorRewards(userId);
  if (!tiers.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tiers.map((t) => {
        const meta = tierMeta(t);
        if (!meta) return null;
        const Icon = meta.icon;
        return (
          <span
            key={t}
            title={`${meta.name} • ${meta.label} seguidores`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${meta.bg} ${meta.color} ${meta.ring}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {!compact && <span>{meta.label}</span>}
          </span>
        );
      })}
    </div>
  );
}

export function TopCreatorBadge({ userId }: { userId?: string }) {
  const tiers = useCreatorRewards(userId);
  if (!tiers.length) return null;
  const top = Math.max(...tiers);
  const meta = tierMeta(top);
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span
      title={`${meta.name} • ${meta.label}`}
      className={`inline-flex shrink-0 items-center justify-center h-5 w-5 rounded-full ring-1 ${meta.bg} ${meta.color} ${meta.ring}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
