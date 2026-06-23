import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { ArrowLeft, Camera, Save, Search, UserPlus, ShieldCheck, Shield, UserMinus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups/$id/edit")({
  component: GroupEditPage,
});

type Member = { user_id: string; role: string; full_name: string | null; username: string | null; avatar_url: string | null };
type Person = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };

function GroupEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const userId = await getCurrentUserId();
    if (!userId) return;
    setMe(userId);
    const { data: chat } = await supabase.from("chats").select("name,bio,avatar_url").eq("id", id).maybeSingle();
    if (chat) {
      setName(chat.name ?? "");
      setBio((chat as any).bio ?? "");
      setAvatarUrl(chat.avatar_url ?? null);
    }
    const { data: cm } = await supabase.from("chat_members").select("user_id,role").eq("chat_id", id);
    const rows = (cm ?? []) as Array<{ user_id: string; role: string }>;
    const ids = rows.map((r) => r.user_id);
    const { data: profs } = await supabase.from("profiles").select("id,full_name,username,avatar_url").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byId: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { byId[p.id] = p; });
    const merged: Member[] = rows.map((r) => ({ user_id: r.user_id, role: r.role, full_name: byId[r.user_id]?.full_name ?? null, username: byId[r.user_id]?.username ?? null, avatar_url: byId[r.user_id]?.avatar_url ?? null }));
    merged.sort((a, b) => (a.role === "admin" ? -1 : 1) - (b.role === "admin" ? -1 : 1));
    setMembers(merged);
    setIsAdmin(rows.find((r) => r.user_id === userId)?.role === "admin");
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  function onPickAvatar(f: File | null) {
    setAvatarFile(f);
    setAvatarPreview(f ? URL.createObjectURL(f) : null);
  }

  async function save() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      let nextUrl = avatarUrl;
      if (avatarFile && me) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `groups/${id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { contentType: avatarFile.type });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
          nextUrl = pub.publicUrl;
        }
      }
      const { error } = await supabase.from("chats").update({ name: name.trim() || null, bio: bio.trim() || null, avatar_url: nextUrl } as any).eq("id", id);
      if (error) throw error;
      setAvatarUrl(nextUrl);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Grupo atualizado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAdmin(m: Member) {
    if (!isAdmin || m.user_id === me) return;
    const next = m.role === "admin" ? "member" : "admin";
    const { error } = await supabase.from("chat_members").update({ role: next }).eq("chat_id", id).eq("user_id", m.user_id);
    if (error) { toast.error(error.message); return; }
    toast.success(next === "admin" ? "Promovido a admin" : "Removido de admin");
    load();
  }

  async function removeMember(m: Member) {
    if (!isAdmin || m.user_id === me) return;
    if (!confirm(`Remover ${m.full_name || m.username || "membro"} do grupo?`)) return;
    const { error } = await supabase.from("chat_members").delete().eq("chat_id", id).eq("user_id", m.user_id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function leave() {
    if (!me) return;
    if (!confirm("Sair deste grupo?")) return;
    const { error } = await supabase.from("chat_members").delete().eq("chat_id", id).eq("user_id", me);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/groups" });
  }

  return (
    <>
      <header className="app-header px-3 py-3 flex items-center gap-2">
        <Link to="/chats/$id" params={{ id }} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold flex-1 truncate">{isAdmin ? "Editar grupo" : "Sobre o grupo"}</h1>
      </header>
      <main className="app-content px-4 py-4 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <label className={`relative ${isAdmin ? "cursor-pointer" : ""}`}>
            <div className="h-28 w-28 rounded-full bg-gradient-brand grid place-items-center text-white text-4xl font-bold overflow-hidden shadow-soft">
              {(avatarPreview || avatarUrl) ? (
                <img src={avatarPreview || avatarUrl!} alt="" className="h-full w-full object-cover" />
              ) : (
                (name || "G").charAt(0).toUpperCase()
              )}
            </div>
            {isAdmin && (
              <>
                <div className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center shadow"><Camera className="h-4 w-4" /></div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)} />
              </>
            )}
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Nome</span>
          <input disabled={!isAdmin} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-2xl bg-input/60 border px-4 py-3 outline-none focus:ring-2 focus:ring-ring disabled:opacity-70" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Bio</span>
          <textarea disabled={!isAdmin} value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full rounded-2xl bg-input/60 border px-4 py-3 outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-70" />
        </label>

        {isAdmin && (
          <button onClick={save} disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-muted-foreground">{members.length} membros</div>
            {isAdmin && (
              <button onClick={() => setShowAdd(true)} className="text-xs font-semibold text-primary flex items-center gap-1">
                <UserPlus className="h-4 w-4" /> Adicionar
              </button>
            )}
          </div>
          <ul className="-mx-2">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl">
                <div className="h-10 w-10 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold overflow-hidden">
                  {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.full_name || m.username || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-1.5">
                    {m.full_name || m.username || "Usuário"}
                    {m.user_id === me && <span className="text-[10px] text-muted-foreground">(você)</span>}
                  </div>
                  {m.role === "admin" && <div className="text-[11px] text-primary font-semibold flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Admin</div>}
                </div>
                {isAdmin && m.user_id !== me && (
                  <>
                    <button onClick={() => toggleAdmin(m)} className="h-9 w-9 rounded-full hover:bg-muted grid place-items-center text-muted-foreground" aria-label="Alternar admin">
                      {m.role === "admin" ? <Shield className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                    <button onClick={() => removeMember(m)} className="h-9 w-9 rounded-full hover:bg-destructive/10 grid place-items-center text-destructive" aria-label="Remover">
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        <button onClick={leave} className="w-full rounded-full bg-destructive/10 text-destructive py-3 font-semibold">
          Sair do grupo
        </button>
      </main>

      {showAdd && me && <AddMembersSheet chatId={id} existing={new Set(members.map((m) => m.user_id))} onClose={() => { setShowAdd(false); load(); }} />}
    </>
  );
}

function AddMembersSheet({ chatId, existing, onClose }: { chatId: string; existing: Set<string>; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getCurrentUserId();
      if (!userId) return;
      let query = supabase.from("profiles").select("id,full_name,username,avatar_url").neq("id", userId).limit(30);
      if (q.trim()) query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);
      const { data } = await query;
      if (!cancelled) setPeople(((data ?? []) as Person[]).filter((p) => !existing.has(p.id)));
    })();
    return () => { cancelled = true; };
  }, [q, existing]);

  function toggle(id: string) {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  }

  async function add() {
    if (picked.size === 0) return;
    setSaving(true);
    const rows = Array.from(picked).map((uid) => ({ chat_id: chatId, user_id: uid, role: "member" as const }));
    const { error } = await supabase.from("chat_members").insert(rows);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${picked.size} adicionado(s)`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[480px] mx-auto bg-card rounded-t-3xl p-5 space-y-3 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Adicionar membros</h2>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoas" className="w-full rounded-2xl bg-input/60 pl-9 pr-4 py-3 outline-none border focus:ring-2 focus:ring-ring" />
        </div>
        <div className="overflow-y-auto -mx-2 flex-1">
          <ul>
            {people.map((p) => {
              const sel = picked.has(p.id);
              return (
                <li key={p.id}>
                  <button onClick={() => toggle(p.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 text-left">
                    <div className="h-10 w-10 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold overflow-hidden">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.full_name || p.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.full_name || p.username}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.username ? `@${p.username}` : ""}</div>
                    </div>
                    <div className={`h-6 w-6 rounded-full border-2 grid place-items-center ${sel ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                      {sel && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <button disabled={picked.size === 0 || saving} onClick={add} className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50">
          {saving ? "Adicionando..." : `Adicionar${picked.size > 0 ? ` (${picked.size})` : ""}`}
        </button>
      </div>
    </div>
  );
}
