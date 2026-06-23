// Plus visual customizations — opt-in cosmetic upgrades for PLUS subscribers.
// All settings are persisted in localStorage and applied as data-* attributes
// on <html>. Free users default to "default" and may pick any non-plusOnly option.

export type PlusThemeId =
  | "default"
  | "gold" | "sapphire" | "amethyst" | "midnight"
  | "rose" | "neon" | "sunset" | "forest" | "holographic"
  | "ocean" | "ember" | "lavender" | "mint" | "coral" | "copper" | "ice" | "slate";

export type PlusWallpaperId =
  | "default"
  | "aurora" | "dunes" | "carbon" | "blossom" | "abyss" | "linen" | "circuit"
  | "galaxy" | "dots" | "stripes" | "waves" | "marble" | "mosaic";

export type PlusBubbleId =
  | "default" | "square" | "pill" | "soft" | "gradient" | "glass"
  | "outlined" | "shadow" | "tail";

export type PlusNameFontId =
  | "default" | "serif" | "mono" | "script" | "display" | "marker"
  | "comic" | "condensed" | "retro";

export type PlusCursorId = "default" | "neon" | "ring" | "dot" | "crosshair" | "magnet";

export type PlusChatSizeId = "default" | "compact" | "comfortable" | "large" | "xlarge";

export type PlusGlowId = "default" | "soft" | "ring" | "pulse" | "rainbow" | "ember";

export const PLUS_THEMES: { id: PlusThemeId; label: string; swatch: string; plusOnly: boolean }[] = [
  { id: "default", label: "Padrão JTC", swatch: "linear-gradient(135deg,#10b981,#059669)", plusOnly: false },
  { id: "gold", label: "Ouro", swatch: "linear-gradient(135deg,#fde68a,#f59e0b,#b45309)", plusOnly: true },
  { id: "sapphire", label: "Safira", swatch: "linear-gradient(135deg,#60a5fa,#2563eb,#1e3a8a)", plusOnly: true },
  { id: "amethyst", label: "Ametista", swatch: "linear-gradient(135deg,#c4b5fd,#8b5cf6,#6d28d9)", plusOnly: true },
  { id: "midnight", label: "Meia-noite", swatch: "linear-gradient(135deg,#1f2937,#0f172a,#020617)", plusOnly: true },
  { id: "rose", label: "Rosê", swatch: "linear-gradient(135deg,#fecdd3,#fb7185,#9f1239)", plusOnly: true },
  { id: "neon", label: "Neon", swatch: "linear-gradient(135deg,#22d3ee,#a3e635,#fde047)", plusOnly: true },
  { id: "sunset", label: "Pôr do sol", swatch: "linear-gradient(135deg,#fb923c,#ef4444,#a855f7)", plusOnly: true },
  { id: "forest", label: "Floresta", swatch: "linear-gradient(135deg,#bbf7d0,#16a34a,#14532d)", plusOnly: true },
  { id: "holographic", label: "Holograma", swatch: "linear-gradient(135deg,#fbcfe8,#a5f3fc,#bbf7d0,#fde68a)", plusOnly: true },
  { id: "ocean", label: "Oceano", swatch: "linear-gradient(135deg,#67e8f9,#0891b2,#0c4a6e)", plusOnly: true },
  { id: "ember", label: "Brasa", swatch: "linear-gradient(135deg,#fbbf24,#dc2626,#7f1d1d)", plusOnly: true },
  { id: "lavender", label: "Lavanda", swatch: "linear-gradient(135deg,#e9d5ff,#a78bfa,#6d28d9)", plusOnly: true },
  { id: "mint", label: "Menta", swatch: "linear-gradient(135deg,#a7f3d0,#34d399,#047857)", plusOnly: true },
  { id: "coral", label: "Coral", swatch: "linear-gradient(135deg,#fecaca,#f87171,#b91c1c)", plusOnly: true },
  { id: "copper", label: "Cobre", swatch: "linear-gradient(135deg,#fed7aa,#c2410c,#7c2d12)", plusOnly: true },
  { id: "ice", label: "Gelo", swatch: "linear-gradient(135deg,#e0f2fe,#7dd3fc,#0369a1)", plusOnly: true },
  { id: "slate", label: "Grafite", swatch: "linear-gradient(135deg,#cbd5e1,#475569,#1e293b)", plusOnly: true },
];

export const PLUS_WALLPAPERS: { id: PlusWallpaperId; label: string; preview: string; plusOnly: boolean }[] = [
  { id: "default", label: "Padrão", preview: "color-mix(in oklab, var(--color-muted) 50%, transparent)", plusOnly: false },
  { id: "aurora", label: "Aurora", preview: "linear-gradient(135deg,#1e3a8a,#7c3aed,#ec4899)", plusOnly: true },
  { id: "dunes", label: "Dunas", preview: "linear-gradient(180deg,#fde68a,#f59e0b,#b45309)", plusOnly: true },
  { id: "carbon", label: "Carbono", preview: "linear-gradient(135deg,#0f172a,#1f2937,#0b1220)", plusOnly: true },
  { id: "blossom", label: "Flor", preview: "linear-gradient(135deg,#fce7f3,#fbcfe8,#f9a8d4)", plusOnly: true },
  { id: "abyss", label: "Abismo", preview: "radial-gradient(circle at 30% 20%,#1e293b,#020617)", plusOnly: true },
  { id: "linen", label: "Linho", preview: "linear-gradient(180deg,#fafaf9,#f5f5f4)", plusOnly: true },
  { id: "circuit", label: "Circuito", preview: "linear-gradient(135deg,#052e16,#14532d,#22c55e)", plusOnly: true },
  { id: "galaxy", label: "Galáxia", preview: "radial-gradient(circle at 20% 30%,#312e81,#000)", plusOnly: true },
  { id: "dots", label: "Pontos", preview: "radial-gradient(#94a3b8 1px,transparent 1px) 0 0/12px 12px,#f1f5f9", plusOnly: true },
  { id: "stripes", label: "Listras", preview: "repeating-linear-gradient(45deg,#e2e8f0 0 8px,#fff 8px 16px)", plusOnly: true },
  { id: "waves", label: "Ondas", preview: "linear-gradient(135deg,#06b6d4,#3b82f6,#8b5cf6)", plusOnly: true },
  { id: "marble", label: "Mármore", preview: "linear-gradient(135deg,#f8fafc,#cbd5e1,#94a3b8)", plusOnly: true },
  { id: "mosaic", label: "Mosaico", preview: "linear-gradient(45deg,#ef4444,#f59e0b,#10b981,#3b82f6,#8b5cf6)", plusOnly: true },
];

export const PLUS_BUBBLES: { id: PlusBubbleId; label: string; plusOnly: boolean }[] = [
  { id: "default", label: "Padrão", plusOnly: false },
  { id: "square", label: "Quadrado", plusOnly: true },
  { id: "pill", label: "Pílula", plusOnly: true },
  { id: "soft", label: "Macio", plusOnly: true },
  { id: "gradient", label: "Gradiente", plusOnly: true },
  { id: "glass", label: "Vidro", plusOnly: true },
  { id: "outlined", label: "Contorno", plusOnly: true },
  { id: "shadow", label: "Sombra", plusOnly: true },
  { id: "tail", label: "Cauda", plusOnly: true },
];

export const PLUS_NAME_FONTS: { id: PlusNameFontId; label: string; sample: string; plusOnly: boolean }[] = [
  { id: "default", label: "Padrão", sample: "Inter", plusOnly: false },
  { id: "serif", label: "Editorial", sample: "Playfair", plusOnly: true },
  { id: "mono", label: "Código", sample: "JetBrains Mono", plusOnly: true },
  { id: "script", label: "Caligrafia", sample: "Dancing", plusOnly: true },
  { id: "display", label: "Display", sample: "Bebas Neue", plusOnly: true },
  { id: "marker", label: "Caneta", sample: "Permanent", plusOnly: true },
  { id: "comic", label: "Quadrinhos", sample: "Bangers", plusOnly: true },
  { id: "condensed", label: "Condensado", sample: "Oswald", plusOnly: true },
  { id: "retro", label: "Retrô", sample: "Lobster", plusOnly: true },
];

export const PLUS_CURSORS: { id: PlusCursorId; label: string; plusOnly: boolean }[] = [
  { id: "default", label: "Padrão", plusOnly: false },
  { id: "neon", label: "Neon", plusOnly: true },
  { id: "ring", label: "Anel", plusOnly: true },
  { id: "dot", label: "Ponto", plusOnly: true },
  { id: "crosshair", label: "Mira", plusOnly: true },
  { id: "magnet", label: "Ímã", plusOnly: true },
];

export const PLUS_CHAT_SIZES: { id: PlusChatSizeId; label: string; plusOnly: boolean }[] = [
  { id: "default", label: "Padrão", plusOnly: false },
  { id: "compact", label: "Compacto", plusOnly: true },
  { id: "comfortable", label: "Confortável", plusOnly: true },
  { id: "large", label: "Grande", plusOnly: true },
  { id: "xlarge", label: "Extra grande", plusOnly: true },
];

export const PLUS_GLOWS: { id: PlusGlowId; label: string; plusOnly: boolean }[] = [
  { id: "default", label: "Sem brilho", plusOnly: false },
  { id: "soft", label: "Suave", plusOnly: true },
  { id: "ring", label: "Halo", plusOnly: true },
  { id: "pulse", label: "Pulsar", plusOnly: true },
  { id: "rainbow", label: "Arco-íris", plusOnly: true },
  { id: "ember", label: "Brasa", plusOnly: true },
];

const KEYS = {
  theme: "jtc.plusTheme",
  wallpaper: "jtc.plusWallpaper",
  bubble: "jtc.plusBubble",
  nameFont: "jtc.plusNameFont",
  cursor: "jtc.plusCursor",
  chatSize: "jtc.plusChatSize",
  glow: "jtc.plusGlow",
} as const;

function read<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return ((window.localStorage.getItem(key) as T | null) ?? fallback);
}

export function getStoredPlusTheme(): PlusThemeId { return read<PlusThemeId>(KEYS.theme, "default"); }
export function getStoredPlusWallpaper(): PlusWallpaperId { return read<PlusWallpaperId>(KEYS.wallpaper, "default"); }
export function getStoredPlusBubble(): PlusBubbleId { return read<PlusBubbleId>(KEYS.bubble, "default"); }
export function getStoredPlusNameFont(): PlusNameFontId { return read<PlusNameFontId>(KEYS.nameFont, "default"); }
export function getStoredPlusCursor(): PlusCursorId { return read<PlusCursorId>(KEYS.cursor, "default"); }
export function getStoredPlusChatSize(): PlusChatSizeId { return read<PlusChatSizeId>(KEYS.chatSize, "default"); }
export function getStoredPlusGlow(): PlusGlowId { return read<PlusGlowId>(KEYS.glow, "default"); }

function applyAttr(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(name, value);
}

export function applyPlusTheme(theme: PlusThemeId) { applyAttr("data-plus-theme", theme); }
export function applyPlusWallpaper(w: PlusWallpaperId) { applyAttr("data-plus-wallpaper", w); }
export function applyPlusBubble(b: PlusBubbleId) { applyAttr("data-plus-bubble", b); }
export function applyPlusNameFont(f: PlusNameFontId) { applyAttr("data-plus-name-font", f); }
export function applyPlusCursor(c: PlusCursorId) { applyAttr("data-plus-cursor", c); }
export function applyPlusChatSize(s: PlusChatSizeId) { applyAttr("data-plus-chat-size", s); }
export function applyPlusGlow(g: PlusGlowId) { applyAttr("data-plus-glow", g); }

export function setPlusTheme(v: PlusThemeId) { if (typeof window !== "undefined") window.localStorage.setItem(KEYS.theme, v); applyPlusTheme(v); }
export function setPlusWallpaper(v: PlusWallpaperId) { if (typeof window !== "undefined") window.localStorage.setItem(KEYS.wallpaper, v); applyPlusWallpaper(v); }
export function setPlusBubble(v: PlusBubbleId) { if (typeof window !== "undefined") window.localStorage.setItem(KEYS.bubble, v); applyPlusBubble(v); }
export function setPlusNameFont(v: PlusNameFontId) { if (typeof window !== "undefined") window.localStorage.setItem(KEYS.nameFont, v); applyPlusNameFont(v); }
export function setPlusCursor(v: PlusCursorId) { if (typeof window !== "undefined") window.localStorage.setItem(KEYS.cursor, v); applyPlusCursor(v); }
export function setPlusChatSize(v: PlusChatSizeId) { if (typeof window !== "undefined") window.localStorage.setItem(KEYS.chatSize, v); applyPlusChatSize(v); }
export function setPlusGlow(v: PlusGlowId) { if (typeof window !== "undefined") window.localStorage.setItem(KEYS.glow, v); applyPlusGlow(v); }

// Auto-apply is handled by `@/lib/plus-settings` which is the source of truth.
