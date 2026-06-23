import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReportReason =
  | "spam_golpe"
  | "assedio_bullying"
  | "nudez"
  | "odio_violencia"
  | "automutilacao"
  | "outro";

export type ReportTargetType = "profile" | "post" | "message" | "comment";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam_golpe: "Spam ou golpe",
  assedio_bullying: "Assédio ou bullying",
  nudez: "Nudez ou conteúdo sexual",
  odio_violencia: "Discurso de ódio ou violência",
  automutilacao: "Automutilação ou suicídio",
  outro: "Outro motivo",
};

async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  } as any);
  if (!isAdmin) throw new Error("Acesso negado.");
}

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      target_type: ReportTargetType;
      target_id: string;
      target_user_id: string;
      reason: ReportReason;
      details?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (data.target_user_id === context.userId) {
      throw new Error("Você não pode denunciar a si mesmo.");
    }
    const details = (data.details ?? "").trim().slice(0, 1500) || null;
    const { error } = await context.supabase.from("reports").insert({
      reporter_id: context.userId,
      target_type: data.target_type,
      target_id: data.target_id,
      target_user_id: data.target_user_id,
      reason: data.reason,
      details,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AdminReportRow = {
  id: string;
  created_at: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  reason: ReportReason;
  details: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reporter: { id: string; username: string | null; full_name: string | null; avatar_url: string | null };
  target_user: { id: string; username: string | null; full_name: string | null; avatar_url: string | null; reports_count: number; under_supervision: boolean; banned: boolean };
};

export const adminListReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { status?: "all" | "pending" | "reviewed" | "dismissed" | "actioned"; limit?: number } | undefined) =>
      input ?? {},
  )
  .handler(async ({ data, context }): Promise<AdminReportRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data.limit ?? 100, 1), 500);
    let q = supabaseAdmin
      .from("reports")
      .select("id,created_at,status,reason,details,target_type,target_id,reporter_id,target_user_id")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = new Set<string>();
    (rows ?? []).forEach((r: any) => {
      ids.add(r.reporter_id);
      ids.add(r.target_user_id);
    });
    const idArr = Array.from(ids);
    const [{ data: profs }, { data: mods }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,username,full_name,avatar_url").in("id", idArr.length ? idArr : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("user_moderation").select("user_id,reports_count,under_supervision,banned").in("user_id", idArr.length ? idArr : ["00000000-0000-0000-0000-000000000000"]),
    ]);
    const pMap = new Map<string, any>((profs ?? []).map((p: any) => [p.id, p]));
    const mMap = new Map<string, any>((mods ?? []).map((m: any) => [m.user_id, m]));

    return (rows ?? []).map((r: any) => {
      const rp = pMap.get(r.reporter_id) ?? { id: r.reporter_id, username: null, full_name: null, avatar_url: null };
      const tp = pMap.get(r.target_user_id) ?? { id: r.target_user_id, username: null, full_name: null, avatar_url: null };
      const tm = mMap.get(r.target_user_id) ?? { reports_count: 0, under_supervision: false, banned: false };
      return {
        id: r.id,
        created_at: r.created_at,
        status: r.status,
        reason: r.reason,
        details: r.details,
        target_type: r.target_type,
        target_id: r.target_id,
        reporter: { id: rp.id, username: rp.username, full_name: rp.full_name, avatar_url: rp.avatar_url },
        target_user: {
          id: tp.id,
          username: tp.username,
          full_name: tp.full_name,
          avatar_url: tp.avatar_url,
          reports_count: tm.reports_count ?? 0,
          under_supervision: !!tm.under_supervision,
          banned: !!tm.banned,
        },
      };
    });
  });

export const adminUpdateReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string; status: "reviewed" | "dismissed" | "actioned"; notes?: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        status: data.status,
        admin_notes: data.notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.reportId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBanPermanent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; reason?: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Não opere sobre si.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Supabase ban: ~100 years
    const { error: e1 } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: `${100 * 365 * 24}h`,
    } as any);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabaseAdmin.from("user_moderation").upsert(
      {
        user_id: data.userId,
        banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: data.reason ?? null,
        banned_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const adminUnbanPermanent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: e1 } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" } as any);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabaseAdmin
      .from("user_moderation")
      .upsert(
        { user_id: data.userId, banned: false, banned_at: null, banned_reason: null, banned_by: null, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

// ============ SECRET: ADM chat visibility ============
export type AdminChatRow = {
  id: string;
  type: string;
  name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  members: { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[];
};

export const adminListUserChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }): Promise<AdminChatRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: members, error } = await supabaseAdmin
      .from("chat_members")
      .select("chat_id, chats!inner(id,type,name,last_message,last_message_at)")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const chatIds = (members ?? []).map((m: any) => m.chat_id);
    if (!chatIds.length) return [];

    const { data: allMembers } = await supabaseAdmin
      .from("chat_members")
      .select("chat_id,user_id,profiles!inner(id,username,full_name,avatar_url)")
      .in("chat_id", chatIds);
    const byChat = new Map<string, any[]>();
    (allMembers ?? []).forEach((m: any) => {
      const arr = byChat.get(m.chat_id) ?? [];
      arr.push(m.profiles);
      byChat.set(m.chat_id, arr);
    });

    return (members ?? []).map((m: any) => ({
      id: m.chats.id,
      type: m.chats.type,
      name: m.chats.name,
      last_message: m.chats.last_message,
      last_message_at: m.chats.last_message_at,
      members: byChat.get(m.chat_id) ?? [],
    }));
  });

export type AdminChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: string | null;
  created_at: string;
  sender: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

export const adminViewChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chatId: string; limit?: number }) => input)
  .handler(async ({ data, context }): Promise<AdminChatMessage[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data.limit ?? 300, 1), 1000);
    const { data: msgs, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id,chat_id,sender_id,content,message_type,created_at")
      .eq("chat_id", data.chatId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    const senderIds = Array.from(new Set((msgs ?? []).map((m: any) => m.sender_id)));
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .in("id", senderIds.length ? senderIds : ["00000000-0000-0000-0000-000000000000"]);
    const pMap = new Map<string, any>((profs ?? []).map((p: any) => [p.id, p]));
    return (msgs ?? []).map((m: any) => ({
      ...m,
      sender: pMap.get(m.sender_id) ?? null,
    }));
  });
