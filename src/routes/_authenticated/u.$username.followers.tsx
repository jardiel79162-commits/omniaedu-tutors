import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { ArrowLeft, EyeOff, Users } from "lucide-react";
import { CachedImage } from "@/components/CachedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export const Route = createFileRoute("/_authenticated/u/$username/followers")({
  component: FollowersListPage,
});

type Row = { id: string; full_name: string | null; username: string | null; avatar_url: string | null; is_plus: boolean | null };

function FollowersListPage() {
  const { username } = Route.useParams();
  const [me, setMe] = useState<string | null>(null);
  const [owner, setOwner] = useState<{ id: string; full_name: string | null; username: string | null; hide_followers: boolean } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      setMe(uid);
      const { data: p } = await supabase
        .from("profiles")
        .select("id,full_name,username,hide_followers")
        .eq("username", username)
        .maybeSingle();
      if (!p) {
        setLoading(false);
        return;
      }
      const ownerRow = p as any;
      setOwner(ownerRow);
      if (ownerRow.hide_followers && uid !== ownerRow.id) {
        setBlocked(true);
        setLoading(false);
        return;
      }
      const { data: follows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", ownerRow.id);
      const ids = (follows ?? []).map((f: any) => f.follower_id);
      if (!ids.length) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,username,avatar_url,is_plus")
        .in("id", ids);
      setRows((profs ?? []) as Row[]);
      setLoading(false);
    })();
  }, [username]);

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-background/85 backdrop-blur border-b border-border">
        <Link to="/u/$username" params={{ username }} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">@{username}</div>
          <h1 className="text-base font-bold leading-tight">Seguidores</h1>
        </div>
      </header>

      {loading ? (
        <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : blocked ? (
        <div className="p-8 text-center max-w-md mx-auto">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted grid place-items-center text-muted-foreground mb-4">
            <EyeOff className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-semibold">Lista oculta</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Você não poderá visualizar os seguidores desta conta.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-60" />
          Nenhum seguidor ainda.
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                to="/u/$username"
                params={{ username: r.username ?? "" }}
                className="flex items-center gap-3 px-4 py-3 active:bg-muted"
              >
                <div className="h-11 w-11 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold overflow-hidden">
                  {r.avatar_url ? (
                    <CachedImage src={r.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    (r.full_name || r.username || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-1">
                    <span className={`truncate ${r.is_plus ? "plus-name" : ""}`}>{r.full_name || r.username}</span>
                    {r.is_plus && <VerifiedBadge />}
                  </div>
                  {r.username && (
                    <div className="text-xs text-muted-foreground truncate">@{r.username}</div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
