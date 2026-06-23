// Centralized Plus customization settings.
// - Persists to the user's profile (profiles.plus_settings JSONB)
// - Mirrors to localStorage for offline / instant boot
// - Applies as data-* attributes on <html>
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import {
  applyPlusTheme, applyPlusWallpaper, applyPlusBubble, applyPlusNameFont,
  applyPlusCursor, applyPlusChatSize, applyPlusGlow,
  type PlusThemeId, type PlusWallpaperId, type PlusBubbleId, type PlusNameFontId,
  type PlusCursorId, type PlusChatSizeId, type PlusGlowId,
} from "@/lib/plus-theme";

export type PlusStoryRingId = "default" | "gold" | "rainbow" | "neon" | "fire" | "ocean";
export type PlusBannerId = "default" | "aurora" | "sunset" | "midnight" | "ocean" | "forest" | "rose" | "noir";

export type PlusSettings = {
  theme: PlusThemeId;
  wallpaper: PlusWallpaperId;
  bubble: PlusBubbleId;
  nameFont: PlusNameFontId;
  cursor: PlusCursorId;
  chatSize: PlusChatSizeId;
  glow: PlusGlowId;
  storyRing: PlusStoryRingId;
  banner: PlusBannerId;
};

export const DEFAULT_SETTINGS: PlusSettings = {
  theme: "default", wallpaper: "default", bubble: "default", nameFont: "default",
  cursor: "default", chatSize: "default", glow: "default",
  storyRing: "default", banner: "default",
};

const LS_KEY = "jtc.plusSettings.v2";

let current: PlusSettings = { ...DEFAULT_SETTINGS };
const listeners = new Set<(s: PlusSettings) => void>();

function readLocal(): PlusSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function writeLocal(s: PlusSettings) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

export function applyPlusSettings(s: PlusSettings) {
  applyPlusTheme(s.theme);
  applyPlusWallpaper(s.wallpaper);
  applyPlusBubble(s.bubble);
  applyPlusNameFont(s.nameFont);
  applyPlusCursor(s.cursor);
  applyPlusChatSize(s.chatSize);
  applyPlusGlow(s.glow);
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-plus-story-ring", s.storyRing);
    document.documentElement.setAttribute("data-plus-banner", s.banner);
  }
}

export function getPlusSettings(): PlusSettings { return current; }

export function subscribePlusSettings(fn: (s: PlusSettings) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emit() { listeners.forEach((l) => l(current)); }

/** Apply locally for live preview (not persisted). */
export function previewPlusSettings(partial: Partial<PlusSettings>) {
  const next = { ...current, ...partial };
  current = next;
  applyPlusSettings(next);
  emit();
}

/** Save partial changes: persists locally, applies, then writes to the user profile. */
export async function savePlusSettings(partial: Partial<PlusSettings>): Promise<void> {
  const next = { ...current, ...partial };
  current = next;
  applyPlusSettings(next);
  writeLocal(next);
  emit();
  try {
    const uid = await getCurrentUserId();
    if (!uid) return;
    await supabase.from("profiles").update({ plus_settings: next as any }).eq("id", uid);
  } catch { /* offline — local copy will sync next time */ }
}

/** Boot: apply local copy immediately, then reconcile with the DB silently. */
export async function bootPlusSettings(): Promise<void> {
  current = readLocal();
  applyPlusSettings(current);
  emit();
  try {
    const uid = await getCurrentUserId();
    if (!uid) return;
    const { data } = await supabase.from("profiles").select("plus_settings").eq("id", uid).maybeSingle();
    const remote = (data?.plus_settings as Partial<PlusSettings> | null) || null;
    if (remote && typeof remote === "object" && Object.keys(remote).length) {
      const merged = { ...DEFAULT_SETTINGS, ...remote };
      current = merged;
      applyPlusSettings(merged);
      writeLocal(merged);
      emit();
    }
  } catch { /* ignore */ }
}

// Note: do NOT mutate <html> at module-load time — that causes a React
// hydration mismatch and the page may render blank. The root component
// calls `bootPlusSettings()` from a useEffect after hydration.
if (typeof window !== "undefined") {
  current = readLocal();
}
