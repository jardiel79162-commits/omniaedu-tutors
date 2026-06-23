import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyReservedUsernames = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reserved_usernames")
      .select("id, username, expires_at, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const checkUsernameAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string }) => d)
  .handler(async ({ data, context }) => {
    const u = (data.username ?? "").trim().toLowerCase();
    if (!u || u.length < 2) return { available: false, reason: "too_short" as const };
    if (!/^[a-z0-9_.]+$/.test(u)) return { available: false, reason: "invalid_chars" as const };
    const { data: ok, error } = await context.supabase.rpc("is_username_available", {
      _username: u,
      _for_user: context.userId,
    });
    if (error) throw new Error(error.message);
    return { available: !!ok, reason: ok ? null : ("taken" as const) };
  });

export const reserveUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("reserve_username", {
      _username: data.username,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const releaseReservedUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("release_username_reservation", {
      _id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
