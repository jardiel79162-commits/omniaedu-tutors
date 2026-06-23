import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { ArrowLeft, Search, Check, Camera } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups/new")({
  component: NewGroupPage,
});

type Person = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };

function NewGroupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Map<string, Person>>(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getCurrentUserId();
      if (!userId) return;
      let query = supabase.from("profiles").select("id,full_name,username,avatar_url").neq("id", userId).limit(30);
      if (q.trim()) query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);
      const { data } = await query;
      if (!cancelled) setPeople((data ?? []) as Person[]);
    })();
    return () => { cancelled = true; };
  }, [q]);

  function toggle(p: Person) {
    const next = new Map(picked);
    if (next.has(p.id)) next.delete(p.id); else next.set(p.id, p);
    setPicked(next);
  }

  function onPickAvatar(f: File | null) {
    setAvatarFile(f);
    setAvatarPreview(f ? URL.createObjectURL(f) : null);
  }

  async function create() {
    if (!name.trim() || picked.size === 0) {
      toast.error("Adicione um nome e ao menos um membro");
      return;
    }
    setSaving(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      let avatar_url: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `groups/${userId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { contentType: avatarFile.type, upsert: false });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
          avatar_url = pub.publicUrl;
        }
      }

      const { data: chat, error } = await supabase
        .from("chats")
        .insert({ type: "group", name: name.trim(), bio: bio.trim() || null, avatar_url, created_by: userId } as any)
        .select("id").single();
      if (error) throw error;

      const { error: ownerErr } = await supabase.from("chat_members").insert({ chat_id: chat.id, user_id: userId, role: "admin" });
      if (ownerErr) throw ownerErr;
      const others = Array.from(picked.keys()).map((uid) => ({ chat_id: chat.id, user_id: uid, role: "member" as const }));
      const { error: othersErr } = await supabase.from("chat_members").insert(others);
      if (othersErr) throw othersErr;

      toast.success("Grupo criado");
      navigate({ to: "/chats/$id", params: { id: chat.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar grupo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="app-header px-3 py-3 flex items-center gap-2">
        <Link to="/groups" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold flex-1">Novo grupo</h1>
      </header>
      <main className="app-content px-4 py-4 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <label className="relative cursor-pointer">
            <div className="h-24 w-24 rounded-full bg-gradient-brand grid place-items-center text-white text-3xl font-bold overflow-hidden shadow-soft">
              {avatarPreview ? <img src={avatarPreview} alt="" className="h-full w-full object-cover" /> : (name || "G").charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center shadow">
              <Camera className="h-4 w-4" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)} />
          </label>
          <span className="text-xs text-muted-foreground">Foto do grupo (opcional)</span>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Nome do grupo</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Família" className="mt-1 w-full rounded-2xl bg-input/60 border px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Bio do grupo</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Sobre o que é este grupo" rows={3} className="mt-1 w-full rounded-2xl bg-input/60 border px-4 py-3 outline-none focus:ring-2 focus:ring-ring resize-none" />
        </label>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Adicionar membros {picked.size > 0 && `(${picked.size})`}</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoas" className="w-full rounded-2xl bg-input/60 pl-9 pr-4 py-3 outline-none border focus:ring-2 focus:ring-ring" />
          </div>
          <ul className="mt-2 -mx-2">
            {people.map((p) => {
              const sel = picked.has(p.id);
              return (
                <li key={p.id}>
                  <button onClick={() => toggle(p)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 text-left">
                    <div className="h-10 w-10 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold overflow-hidden">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.full_name || p.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.full_name || p.username}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.username ? `@${p.username}` : ""}</div>
                    </div>
                    <div className={`h-6 w-6 rounded-full border-2 grid place-items-center ${sel ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                      {sel && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <button disabled={saving || !name.trim() || picked.size === 0} onClick={create} className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50">
          {saving ? "Criando..." : `Criar grupo${picked.size > 0 ? ` (${picked.size})` : ""}`}
        </button>
      </main>
    </>
  );
}
