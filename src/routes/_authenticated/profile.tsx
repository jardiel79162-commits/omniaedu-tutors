import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cache } from "@/lib/app-cache";
import { Save, Copy, Check, Camera, Crown, Pencil, X, Settings } from "lucide-react";
import { toast } from "sonner";
import { usePlus } from "@/lib/use-plus";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { checkUsernameAvailability } from "@/lib/reserved-usernames.functions";
import { useServerFn } from "@tanstack/react-start";
import { AvatarCropper } from "@/components/AvatarCropper";
import { ProfilePostsGrid } from "@/components/ProfilePostsGrid";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

type ProfileCache = {
  email: string;
  fullName: string;
  username: string;
  about: string;
  shortCode: string;
  avatarUrl: string | null;
  followers: number;
  following: number;
  posts: number;
};

function ProfilePage() {
  const { isPlus: myIsPlus } = usePlus();
  const cached = cache.get<ProfileCache>("profile");
  const [email, setEmail] = useState(cached?.email ?? "");
  const [fullName, setFullName] = useState(cached?.fullName ?? "");
  const [username, setUsername] = useState(cached?.username ?? "");
  const [about, setAbout] = useState(cached?.about ?? "");
  const [shortCode, setShortCode] = useState(cached?.shortCode ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cached?.avatarUrl ?? null);
  const [counts, setCounts] = useState({
    followers: cached?.followers ?? 0,
    following: cached?.following ?? 0,
    posts: cached?.posts ?? 0,
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      setUserId(user.id);
      const nextEmail = user.email ?? "";
      setEmail(nextEmail);
      const { data } = await supabase
        .from("profiles")
        .select(
          "full_name,username,about,short_code,avatar_url,followers_count,following_count,posts_count",
        )
        .eq("id", user.id)
        .maybeSingle();
      const nextFull = data?.full_name ?? "";
      const nextUser = data?.username ?? "";
      const nextAbout = data?.about ?? "";
      const nextAvatar = (data as any)?.avatar_url ?? null;
      const nextCode = (data as any)?.short_code ?? "";
      const nextCounts = {
        followers: (data as any)?.followers_count ?? 0,
        following: (data as any)?.following_count ?? 0,
        posts: (data as any)?.posts_count ?? 0,
      };
      setFullName(nextFull);
      setUsername(nextUser);
      setAbout(nextAbout);
      setShortCode(nextCode);
      setAvatarUrl(nextAvatar);
      setCounts(nextCounts);
      cache.set<ProfileCache>("profile", {
        email: nextEmail,
        fullName: nextFull,
        username: nextUser,
        about: nextAbout,
        shortCode: nextCode,
        avatarUrl: nextAvatar,
        ...nextCounts,
      });
    })();
  }, []);

  // Live counters: react to followers/following/posts updates on own profile.
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`me-profile-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload: any) => {
          const n: any = payload.new ?? {};
          setCounts({
            followers: n.followers_count ?? 0,
            following: n.following_count ?? 0,
            posts: n.posts_count ?? 0,
          });
          const cur = cache.get<ProfileCache>("profile");
          if (cur)
            cache.set<ProfileCache>("profile", {
              ...cur,
              followers: n.followers_count ?? cur.followers,
              following: n.following_count ?? cur.following,
              posts: n.posts_count ?? cur.posts,
            });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  function pickFile(file: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 15MB)");
      return;
    }
    setCropFile(file);
  }

  async function uploadAvatar(blob: Blob) {
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      const path = `users/${user.id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url } as any)
        .eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(url);
      const next = cache.get<ProfileCache>("profile");
      if (next) cache.set<ProfileCache>("profile", { ...next, avatarUrl: url });
      toast.success("Foto atualizada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  const initial = (fullName || username || email || "").charAt(0).toUpperCase();
  const displayName = fullName || username || "Você";
  const handle = username || (email ? email.split("@")[0] : "voce");

  return (
    <div className="flex flex-col h-full">
      <header className="app-header flex items-center gap-2 px-4 pt-5 pb-3 border-b">
        <h1 className="text-lg font-bold flex-1 truncate">@{handle}</h1>
        <button
          onClick={() => setEditOpen(true)}
          className="text-sm font-semibold text-primary px-2"
          aria-label="Editar perfil"
        >
          Editar
        </button>
        <Link
          to="/settings"
          aria-label="Configurações"
          className="h-9 w-9 rounded-full grid place-items-center text-foreground hover:bg-muted active:bg-muted"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <main className="app-content">
        <div className="p-5 flex items-start gap-4">
          <label className="relative cursor-pointer shrink-0">
            <div className="h-20 w-20 rounded-full bg-gradient-brand grid place-items-center text-white text-2xl font-bold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center shadow border-2 border-background">
              <Camera className="h-3.5 w-3.5" />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold truncate ${myIsPlus ? "plus-name" : ""}`}>{displayName}</h2>
              {myIsPlus && <VerifiedBadge />}
            </div>
            <div className="flex gap-5 mt-3 text-sm">
              <div>
                <strong>{counts.posts}</strong>{" "}
                <span className="text-muted-foreground">posts</span>
              </div>
              {username ? (
                <>
                  <Link
                    to="/u/$username/followers"
                    params={{ username }}
                    className="hover:underline"
                  >
                    <strong>{counts.followers}</strong>{" "}
                    <span className="text-muted-foreground">seguidores</span>
                  </Link>
                  <Link
                    to="/u/$username/following"
                    params={{ username }}
                    className="hover:underline"
                  >
                    <strong>{counts.following}</strong>{" "}
                    <span className="text-muted-foreground">seguindo</span>
                  </Link>
                </>
              ) : (
                <>
                  <div>
                    <strong>{counts.followers}</strong>{" "}
                    <span className="text-muted-foreground">seguidores</span>
                  </div>
                  <div>
                    <strong>{counts.following}</strong>{" "}
                    <span className="text-muted-foreground">seguindo</span>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
        {about && <p className="px-5 text-sm whitespace-pre-wrap">{about}</p>}
        {uploading && (
          <p className="px-5 text-xs text-muted-foreground mt-1">Enviando foto…</p>
        )}

        <div className="px-5 mt-4 flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex-1 rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Pencil className="h-4 w-4" /> Editar perfil
          </button>
          {shortCode && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(shortCode);
                toast.success(`Código ${shortCode} copiado`);
              }}
              className="rounded-md bg-secondary text-secondary-foreground px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
              aria-label="Copiar código"
            >
              <Copy className="h-4 w-4" /> {shortCode}
            </button>
          )}
        </div>

        <div className="px-5 mt-3">
          <PlusEntry />
        </div>

        {userId && <ProfilePostsGrid userId={userId} />}
      </main>

      {cropFile && (
        <AvatarCropper
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={async (blob) => {
            setCropFile(null);
            await uploadAvatar(blob);
          }}
        />
      )}

      {editOpen && (
        <EditProfileSheet
          initial={{ fullName, username, about, shortCode, email }}
          onClose={() => setEditOpen(false)}
          onSaved={(next) => {
            setFullName(next.fullName);
            setUsername(next.username);
            setAbout(next.about);
            const cur = cache.get<ProfileCache>("profile");
            if (cur)
              cache.set<ProfileCache>("profile", {
                ...cur,
                fullName: next.fullName,
                username: next.username,
                about: next.about,
              });
          }}
        />
      )}
    </div>
  );
}

function PlusEntry() {
  const { isPlus } = usePlus();
  return (
    <Link
      to="/plus"
      className="block w-full rounded-2xl p-4 text-white shadow-lg"
      style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)" }}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/20 grid place-items-center">
          <Crown className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm flex items-center gap-1.5">
            Peacely PLUS {isPlus && <VerifiedBadge />}
          </div>
          <div className="text-[11px] opacity-90">
            {isPlus ? "Você é PLUS — aproveite tudo" : "Selo verificado, arquivos ilimitados e mais"}
          </div>
        </div>
        <div className="text-xs font-semibold bg-white/20 rounded-full px-3 py-1">
          {isPlus ? "Ativo" : "Ver"}
        </div>
      </div>
    </Link>
  );
}

function EditProfileSheet({
  initial,
  onClose,
  onSaved,
}: {
  initial: { fullName: string; username: string; about: string; shortCode: string; email: string };
  onClose: () => void;
  onSaved: (next: { fullName: string; username: string; about: string }) => void;
}) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [username, setUsername] = useState(initial.username);
  const [about, setAbout] = useState(initial.about);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  

  const checkUsername = useServerFn(checkUsernameAvailability);

  async function save() {
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setSaving(false);
      return;
    }
    const nextU = username.trim();
    if (nextU && nextU.toLowerCase() !== (initial.username ?? "").toLowerCase()) {
      try {
        const res = await checkUsername({ data: { username: nextU } });
        if (!res.available) {
          setSaving(false);
          toast.error("Este @ está reservado ou em uso");
          return;
        }
      } catch (e: any) {
        setSaving(false);
        toast.error(e?.message ?? "Erro ao validar username");
        return;
      }
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        username: username.trim() || null,
        about: about.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved({ fullName, username, about });
    toast.success("Perfil atualizado");
    onClose();
  }


  return (
    <div
      data-no-swipe
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl border max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-base font-bold">Editar perfil</h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-muted-foreground">{initial.email}</div>

          {initial.shortCode && (
            <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between gap-3 shadow-card">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Seu código
                </div>
                <div className="text-2xl font-extrabold tabular-nums tracking-widest">
                  {initial.shortCode}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Compartilhe para outras pessoas te encontrarem
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(initial.shortCode);
                  setCopied(true);
                  toast.success("Código copiado");
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center"
                aria-label="Copiar código"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}

          <Field label="Nome" value={fullName} onChange={setFullName} placeholder="Seu nome" />
          <Field
            label="Nome de usuário"
            value={username}
            onChange={setUsername}
            placeholder="ex: joao_silva"
          />
          <Field label="Recado" value={about} onChange={setAbout} placeholder="Disponível" />

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold flex items-center justify-center gap-2 shadow-soft"
          >
            <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar alterações"}
          </button>

          <Link
            to="/settings"
            className="w-full rounded-full bg-secondary text-secondary-foreground py-3 font-semibold flex items-center justify-center gap-2"
          >
            <Settings className="h-4 w-4" /> Configurações
          </Link>


          <div className="text-center text-xs text-muted-foreground pt-2">
            Peacely · v1.0
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl bg-input/60 border border-border px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
