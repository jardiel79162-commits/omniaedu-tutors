import { useEffect, useState } from "react";
import { followUser, isFollowing, unfollowUser } from "@/lib/social";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCurrentUserId } from "@/lib/app-cache";
import { supabase } from "@/integrations/supabase/client";

export function FollowButton({
  targetId,
  onChange,
  size = "default",
}: {
  targetId: string;
  onChange?: (following: boolean) => void;
  size?: "default" | "sm";
}) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const uid = await getCurrentUserId();
      if (!live) return;
      setMe(uid);
      if (uid && uid !== targetId) setFollowing(await isFollowing(targetId));
    })();
    return () => {
      live = false;
    };
  }, [targetId]);

  useEffect(() => {
    if (!me || me === targetId) return;
    const ch = supabase
      .channel(`follow-${me}-${targetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows", filter: `following_id=eq.${targetId}` },
        async (payload: any) => {
          const row = payload.new ?? payload.old;
          if (row?.follower_id === me) {
            setFollowing(await isFollowing(targetId));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, targetId]);

  if (!me || me === targetId || following === null) return null;

  async function toggle() {
    setBusy(true);
    try {
      if (following) {
        await unfollowUser(targetId);
        setFollowing(false);
        onChange?.(false);
      } else {
        await followUser(targetId);
        setFollowing(true);
        onChange?.(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size={size}
      variant={following ? "outline" : "default"}
      disabled={busy}
      onClick={toggle}
      className={following ? "" : "bg-primary text-primary-foreground"}
    >
      {following ? "Seguindo" : "Seguir"}
    </Button>
  );
}
