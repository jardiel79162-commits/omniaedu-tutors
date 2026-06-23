import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { fetchPostLikes, type ProfileLite } from "@/lib/social";
import { resolveHandle } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";

export function LikesSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [users, setUsers] = useState<ProfileLite[] | null>(null);

  useEffect(() => {
    let live = true;
    fetchPostLikes(postId).then((u) => live && setUsers(u));
    return () => {
      live = false;
    };
  }, [postId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={onClose}>
      <div
        className="bg-background w-full rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Curtidas</h3>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users === null ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Ninguém curtiu ainda</div>
          ) : (
            users.map((u) => {
              const h = resolveHandle(u);
              return (
                <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Link
                    to="/u/$username"
                    params={{ username: h }}
                    onClick={onClose}
                    className="h-10 w-10 rounded-full bg-gradient-brand grid place-items-center text-white font-bold overflow-hidden shrink-0"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (u.full_name || h).charAt(0).toUpperCase()
                    )}
                  </Link>
                  <Link
                    to="/u/$username"
                    params={{ username: h }}
                    onClick={onClose}
                    className="flex-1 min-w-0"
                  >
                    <div className="text-sm font-semibold truncate">{u.full_name || `@${h}`}</div>
                    <div className="text-xs text-muted-foreground truncate">@{h}</div>
                  </Link>
                  <FollowButton targetId={u.id} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
