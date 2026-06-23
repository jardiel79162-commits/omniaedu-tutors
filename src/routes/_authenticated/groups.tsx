import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cache } from "@/lib/app-cache";
import { Users, Plus } from "lucide-react";

type Group = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
};

export const Route = createFileRoute("/_authenticated/groups")({
  component: GroupsPage,
});

function GroupsPage() {
  const loc = useLocation();
  const cached = cache.get<Group[]>("groups-list");
  const [groups, setGroups] = useState<Group[]>(cached ?? []);

  async function load() {
    const { data } = await supabase
      .from("chats")
      .select("id,name,avatar_url,last_message,last_message_at")
      .eq("type", "group")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    const list = (data ?? []) as Group[];
    setGroups(list);
    cache.set("groups-list", list);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("groups-list").on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loc.pathname !== "/groups") return <Outlet />;

  return (
    <>
      <header className="app-header px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Grupos</h1>
        <Link to="/groups/new" className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft">
          <Plus className="h-5 w-5" />
        </Link>
      </header>
      <main className="app-content">
        {groups.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-accent grid place-items-center text-accent-foreground"><Users className="h-7 w-7" /></div>
            <p className="mt-4 text-sm text-muted-foreground">Nenhum grupo ainda</p>
            <Link to="/groups/new" className="inline-block mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">Criar grupo</Link>
          </div>
        ) : (
          <ul className="divide-y">
            {groups.map(g => (
              <li key={g.id}>
                <Link to="/chats/$id" params={{ id: g.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                  <div className="h-12 w-12 rounded-full bg-gradient-brand grid place-items-center text-white overflow-hidden">
                    {g.avatar_url ? <img src={g.avatar_url} alt="" className="h-full w-full object-cover" /> : <Users className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{g.name || "Grupo"}</div>
                    <div className="text-sm text-muted-foreground truncate">{g.last_message || "Sem mensagens"}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
