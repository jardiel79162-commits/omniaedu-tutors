import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";

export type PlusInfo = {
  isPlus: boolean;
  loading: boolean;
  expiresAt: string | null;
};

let cached: PlusInfo | null = null;
const listeners = new Set<(p: PlusInfo) => void>();

async function refresh(): Promise<PlusInfo> {
  const uid = await getCurrentUserId();
  if (!uid) {
    const v = { isPlus: false, loading: false, expiresAt: null };
    cached = v;
    listeners.forEach(l => l(v));
    return v;
  }
  const { data } = await supabase
    .from("subscriptions" as any)
    .select("plan,status,current_period_end")
    .eq("user_id", uid)
    .maybeSingle();
  const row: any = data;
  const active =
    !!row &&
    row.plan === "plus" &&
    row.status === "active" &&
    (!row.current_period_end || new Date(row.current_period_end) > new Date());
  const v = { isPlus: active, loading: false, expiresAt: row?.current_period_end ?? null };
  cached = v;
  listeners.forEach(l => l(v));
  return v;
}

export function usePlus(): PlusInfo {
  const [state, setState] = useState<PlusInfo>(cached ?? { isPlus: false, loading: true, expiresAt: null });
  useEffect(() => {
    listeners.add(setState);
    if (!cached) refresh();
    return () => { listeners.delete(setState); };
  }, []);
  return state;
}

export function refreshPlus() { return refresh(); }

// Limits
export const FREE_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1 GB (legacy general)
export const PLUS_UPLOAD_BYTES = Number.POSITIVE_INFINITY;
export const FREE_PHOTO_BYTES = 500 * 1024 * 1024; // 500 MB
export const FREE_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB
export const PLUS_PHOTO_BYTES = Number.POSITIVE_INFINITY;
export const PLUS_VIDEO_BYTES = Number.POSITIVE_INFINITY;
export const FREE_GROUP_MEMBERS = 500;
export const PLUS_GROUP_MEMBERS = 2000;
