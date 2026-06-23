import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { usePlus } from "@/lib/use-plus";
import {
  PLUS_THEMES, PLUS_WALLPAPERS, PLUS_BUBBLES, PLUS_NAME_FONTS, PLUS_CURSORS, PLUS_CHAT_SIZES, PLUS_GLOWS,
  type PlusBubbleId,
} from "@/lib/plus-theme";
import {
  getPlusSettings, previewPlusSettings, savePlusSettings,
  type PlusSettings, type PlusStoryRingId, type PlusBannerId,
} from "@/lib/plus-settings";

export const Route = createFileRoute("/_authenticated/plus/personalizar/$cat")({
  component: CategoryEditor,
});

const STORY_RINGS: { id: PlusStoryRingId; label: string; preview: string; plusOnly: boolean }[] = [
  { id: "default", label: "Padrão", preview: "conic-gradient(from 0deg,#10b981,#059669,#10b981)", plusOnly: false },
  { id: "gold", label: "Ouro", preview: "conic-gradient(from 0deg,#fde68a,#f59e0b,#b45309,#f59e0b,#fde68a)", plusOnly: true },
  { id: "rainbow", label: "Arco-íris", preview: "conic-gradient(from 0deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6,#ef4444)", plusOnly: true },
  { id: "neon", label: "Neon", preview: "conic-gradient(from 0deg,#22d3ee,#a3e635,#fde047,#22d3ee)", plusOnly: true },
  { id: "fire", label: "Fogo", preview: "conic-gradient(from 0deg,#fde047,#f97316,#dc2626,#f97316,#fde047)", plusOnly: true },
  { id: "ocean", label: "Oceano", preview: "conic-gradient(from 0deg,#67e8f9,#0891b2,#1e3a8a,#0891b2,#67e8f9)", plusOnly: true },
];

const BANNERS: { id: PlusBannerId; label: string; preview: string; plusOnly: boolean }[] = [
  { id: "default", label: "Padrão", preview: "linear-gradient(135deg,#10b981,#059669)", plusOnly: false },
  { id: "aurora", label: "Aurora", preview: "linear-gradient(135deg,#1e3a8a,#7c3aed,#ec4899)", plusOnly: true },
  { id: "sunset", label: "Pôr do sol", preview: "linear-gradient(135deg,#fb923c,#ef4444,#a855f7)", plusOnly: true },
  { id: "midnight", label: "Meia-noite", preview: "linear-gradient(135deg,#020617,#1e293b,#334155)", plusOnly: true },
  { id: "ocean", label: "Oceano", preview: "linear-gradient(135deg,#67e8f9,#0891b2,#0c4a6e)", plusOnly: true },
  { id: "forest", label: "Floresta", preview: "linear-gradient(135deg,#bbf7d0,#16a34a,#14532d)", plusOnly: true },
  { id: "rose", label: "Rosê", preview: "linear-gradient(135deg,#fecdd3,#fb7185,#9f1239)", plusOnly: true },
  { id: "noir", label: "Noir", preview: "linear-gradient(135deg,#111,#000)", plusOnly: true },
];

type CatId = "tema" | "fundo" | "balao" | "fonte" | "tamanho" | "cursor" | "aura" | "anel" | "capa";

const TITLES: Record<CatId, string> = {
  tema: "Tema do app",
  fundo: "Fundo de conversa",
  balao: "Formato dos balões",
  fonte: "Fonte do seu nome",
  tamanho: "Tamanho do chat",
  cursor: "Cursor exclusivo",
  aura: "Brilho do perfil",
  anel: "Anel dos stories",
  capa: "Capa do perfil",
};

function bubbleStyle(id: PlusBubbleId): React.CSSProperties {
  switch (id) {
    case "square": return { borderRadius: 4 };
    case "pill": return { borderRadius: 9999 };
    case "soft": return { borderRadius: 22 };
    case "gradient": return { borderRadius: 16, background: "linear-gradient(135deg,#0ea5e9,#8b5cf6)" };
    case "glass": return { borderRadius: 16, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.3)" };
    case "outlined": return { borderRadius: 16, background: "transparent", color: "var(--color-primary)", border: "2px solid var(--color-primary)" };
    case "shadow": return { borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.25)" };
    case "tail": return { borderRadius: "16px 16px 4px 16px" };
    default: return { borderRadius: 16 };
  }
}

function CategoryEditor() {
  const { cat } = useParams({ strict: false }) as { cat: CatId };
  const navigate = useNavigate();
  const { isPlus } = usePlus();
  const [original] = useState<PlusSettings>(() => ({ ...getPlusSettings() }));
  const [draft, setDraft] = useState<PlusSettings>(() => ({ ...getPlusSettings() }));
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => JSON.stringify(original) !== JSON.stringify(draft), [original, draft]);

  // Restore original on unmount if user didn't save.
  useEffect(() => {
    return () => {
      // If still dirty when leaving without save, restore preview
      if (JSON.stringify(getPlusSettings()) !== JSON.stringify(original)) {
        previewPlusSettings(original);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick<K extends keyof PlusSettings>(key: K, value: PlusSettings[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    previewPlusSettings({ [key]: value } as Partial<PlusSettings>);
  }

  async function save() {
    setSaving(true);
    try {
      await savePlusSettings(draft);
      toast.success("Personalização salva na sua conta");
      navigate({ to: "/plus/personalizar" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    previewPlusSettings(original);
    setDraft({ ...original });
  }

  return (
    <div className="flex flex-col h-dvh lg:h-full bg-background">
      <header className="shrink-0 backdrop-blur bg-background/85 border-b">
        <div className="flex items-center gap-2 p-3">
          <Link to="/plus/personalizar" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-base font-semibold flex-1 truncate">{TITLES[cat] ?? "Personalizar"}</h1>
          {dirty && (
            <button onClick={discard} className="text-xs font-semibold text-muted-foreground px-2">Desfazer</button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto p-3 lg:p-6 pb-32">
          {cat === "tema" && (
            <Grid cols={3}>
              {PLUS_THEMES.map((t) => (
                <Tile key={t.id} active={draft.theme === t.id} locked={t.plusOnly && !isPlus} label={t.label}
                  onPick={() => pick("theme", t.id)}>
                  <span className="absolute inset-0" style={{ background: t.swatch }} />
                </Tile>
              ))}
            </Grid>
          )}

          {cat === "fundo" && (
            <Grid cols={3}>
              {PLUS_WALLPAPERS.map((w) => (
                <Tile key={w.id} active={draft.wallpaper === w.id} locked={w.plusOnly && !isPlus} label={w.label}
                  onPick={() => pick("wallpaper", w.id)}>
                  <span className="absolute inset-0" style={{ background: w.preview }} />
                </Tile>
              ))}
            </Grid>
          )}

          {cat === "balao" && (
            <Grid cols={3}>
              {PLUS_BUBBLES.map((b) => {
                const locked = b.plusOnly && !isPlus;
                const active = draft.bubble === b.id;
                return (
                  <button key={b.id} onClick={() => !locked && pick("bubble", b.id)} disabled={locked}
                    className={`relative h-24 border-2 rounded-xl grid place-items-center transition bg-muted ${active ? "border-primary" : "border-transparent"} ${locked ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                    aria-label={b.label}>
                    <span className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground" style={bubbleStyle(b.id)}>Olá!</span>
                    <Label text={b.label} />
                    {active && <ActiveBadge />}
                    {locked && <LockBadge />}
                  </button>
                );
              })}
            </Grid>
          )}

          {cat === "fonte" && (
            <Grid cols={2}>
              {PLUS_NAME_FONTS.map((f) => {
                const locked = f.plusOnly && !isPlus;
                const active = draft.nameFont === f.id;
                return (
                  <button key={f.id} onClick={() => !locked && pick("nameFont", f.id)} disabled={locked}
                    className={`relative h-20 border-2 rounded-xl px-3 grid place-items-center transition bg-muted ${active ? "border-primary" : "border-transparent"} ${locked ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                    aria-label={f.label}>
                    <span data-preview-name-font={f.id} className="text-lg font-semibold">Seu Nome</span>
                    <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">{f.label}</span>
                    {active && <ActiveBadge />}
                    {locked && <LockBadge />}
                  </button>
                );
              })}
            </Grid>
          )}

          {cat === "tamanho" && (
            <Grid cols={5}>
              {PLUS_CHAT_SIZES.map((s) => {
                const locked = s.plusOnly && !isPlus;
                const active = draft.chatSize === s.id;
                return (
                  <button key={s.id} onClick={() => !locked && pick("chatSize", s.id)} disabled={locked}
                    className={`relative h-20 border-2 rounded-xl grid place-items-center transition bg-muted ${active ? "border-primary" : "border-transparent"} ${locked ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                    aria-label={s.label}>
                    <span className="text-[11px] font-semibold text-center px-1">{s.label}</span>
                    {active && <ActiveBadge />}
                    {locked && <LockBadge />}
                  </button>
                );
              })}
            </Grid>
          )}

          {cat === "cursor" && (
            <Grid cols={3}>
              {PLUS_CURSORS.map((c) => {
                const locked = c.plusOnly && !isPlus;
                const active = draft.cursor === c.id;
                return (
                  <button key={c.id} onClick={() => !locked && pick("cursor", c.id)} disabled={locked}
                    className={`relative h-20 border-2 rounded-xl grid place-items-center transition bg-muted ${active ? "border-primary" : "border-transparent"} ${locked ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                    aria-label={c.label}>
                    <span className="text-sm font-semibold">{c.label}</span>
                    {active && <ActiveBadge />}
                    {locked && <LockBadge />}
                  </button>
                );
              })}
            </Grid>
          )}

          {cat === "aura" && (
            <Grid cols={3}>
              {PLUS_GLOWS.map((g) => {
                const locked = g.plusOnly && !isPlus;
                const active = draft.glow === g.id;
                return (
                  <button key={g.id} onClick={() => !locked && pick("glow", g.id)} disabled={locked}
                    className={`relative h-24 border-2 rounded-xl grid place-items-center transition bg-muted ${active ? "border-primary" : "border-transparent"} ${locked ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                    aria-label={g.label}>
                    <span data-preview-glow={g.id} className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60" />
                    <Label text={g.label} />
                    {active && <ActiveBadge />}
                    {locked && <LockBadge />}
                  </button>
                );
              })}
            </Grid>
          )}

          {cat === "anel" && (
            <Grid cols={3}>
              {STORY_RINGS.map((r) => (
                <Tile key={r.id} active={draft.storyRing === r.id} locked={r.plusOnly && !isPlus} label={r.label}
                  onPick={() => pick("storyRing", r.id)}>
                  <span className="absolute inset-0 grid place-items-center" style={{ background: "var(--color-muted)" }}>
                    <span className="h-14 w-14 rounded-full p-[3px]" style={{ background: r.preview }}>
                      <span className="h-full w-full rounded-full bg-card block" />
                    </span>
                  </span>
                </Tile>
              ))}
            </Grid>
          )}

          {cat === "capa" && (
            <Grid cols={2}>
              {BANNERS.map((b) => (
                <Tile key={b.id} active={draft.banner === b.id} locked={b.plusOnly && !isPlus} label={b.label}
                  onPick={() => pick("banner", b.id)}>
                  <span className="absolute inset-0" style={{ background: b.preview }} />
                </Tile>
              ))}
            </Grid>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t bg-background/95 backdrop-blur p-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Link to="/plus/personalizar" className="flex-1 h-11 rounded-xl bg-secondary text-secondary-foreground font-semibold grid place-items-center text-sm">
            Voltar
          </Link>
          <button onClick={save} disabled={!dirty || saving}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
            {saving ? "Salvando…" : dirty ? "Salvar alterações" : "Tudo salvo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  const cls = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : cols === 5 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3";
  return <div className={`grid ${cls} gap-2.5`}>{children}</div>;
}
function Tile({ active, locked, onPick, children, label }: { active: boolean; locked: boolean; onPick: () => void; children?: React.ReactNode; label: string }) {
  return (
    <button onClick={() => !locked && onPick()} disabled={locked}
      className={`relative rounded-xl overflow-hidden h-24 border-2 transition ${active ? "border-primary" : "border-transparent"} ${locked ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
      aria-label={label}>
      {children}
      <Label text={label} />
      {active && <ActiveBadge />}
      {locked && <LockBadge />}
    </button>
  );
}
function Label({ text }: { text: string }) {
  return <span className="absolute inset-x-0 bottom-0 bg-black/45 text-white text-[10px] font-semibold py-1 text-center">{text}</span>;
}
function ActiveBadge() { return <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-white text-black grid place-items-center"><Check className="h-3 w-3" /></span>; }
function LockBadge() { return <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-black/60 text-white grid place-items-center"><Lock className="h-3 w-3" /></span>; }
