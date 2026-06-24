import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  full_name: string | null;
  username: string | null;
  short_code: string | null;
  avatar_url: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_plus: boolean;
  plus_until: string | null;
  is_admin: boolean;
  recent_messages_24h: number;
  recent_posts_24h: number;
  recent_logins_24h: number;
  suspicious_score: number;
  suspicious_reasons: string[];
};

export type AdminStats = {
  total_users: number;
  total_posts: number;
  total_messages: number;
  total_chats: number;
  plus_users: number;
  active_24h: number;
  new_users_24h: number;
  new_posts_24h: number;
  new_messages_24h: number;
  suspicious_users: number;
};

async function ensureConfiguredAdmin(context: any) {
  const { data: alreadyAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  } as any);
  if (alreadyAdmin) return true;

  const expected = process.env.JTC_ADMIN_EMAIL?.trim().toLowerCase();
  if (!expected) return false;

  const claimEmail = typeof context.claims?.email === "string" ? context.claims.email : "";
  const { data } = await context.supabase.auth.getUser();
  const signedEmail = (data.user?.email || claimEmail).trim().toLowerCase();
  if (signedEmail !== expected) return false;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("user_roles")
    .upsert(
      { user_id: context.userId, role: "admin" as const },
      { onConflict: "user_id,role" },
    );
  if (error) throw new Error(error.message);
  return true;
}

export const ensureAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ is_admin: await ensureConfiguredAdmin(context) }));

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      return { is_admin: await ensureConfiguredAdmin(context) };
    } catch {
      return { is_admin: false };
    }
  });

async function assertAdmin(context: any) {
  const allowed = await ensureConfiguredAdmin(context);
  if (!allowed) throw new Error("Acesso negado.");
}

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<AdminUserRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const limit = Math.min(Math.max(data.limit ?? 200, 1), 500);
    const search = (data.search ?? "").trim();

    let profQuery = supabaseAdmin
      .from("profiles")
      .select(
        "id,full_name,username,short_code,avatar_url,followers_count,following_count,posts_count,is_plus",
      )
      .neq("id", context.userId)
      .limit(limit);
    if (search) {
      const escaped = search.replace(/[%,]/g, "");
      profQuery = profQuery.or(
        `username.ilike.%${escaped}%,full_name.ilike.%${escaped}%,short_code.eq.${escaped}`,
      );
    }
    const { data: profiles, error: profErr } = await profQuery;
    if (profErr) throw new Error(profErr.message);

    const ids = (profiles ?? []).map((p: any) => p.id);
    if (!ids.length) return [];

    const emailMap = new Map<string, { email: string | null; created_at: string | null; last_sign_in_at: string | null }>();
    try {
      let page = 1;
      while (page < 10) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        const list = users?.users ?? [];
        for (const u of list) {
          emailMap.set(u.id, {
            email: u.email ?? null,
            created_at: u.created_at ?? null,
            last_sign_in_at: u.last_sign_in_at ?? null,
          });
        }
        if (list.length < 200) break;
        page += 1;
      }
    } catch {
      // best-effort
    }

    const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [{ data: msgs24 }, { data: posts24 }, { data: adminRoles }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("chat_messages").select("sender_id").gte("created_at", since24).in("sender_id", ids),
      supabaseAdmin.from("posts").select("author_id").gte("created_at", since24).in("author_id", ids),
      supabaseAdmin.from("user_roles").select("user_id,role").eq("role", "admin").in("user_id", ids),
      supabaseAdmin.from("subscriptions").select("user_id,plan,status,current_period_end").in("user_id", ids),
    ]);

    const msgCount = new Map<string, number>();
    (msgs24 ?? []).forEach((m: any) => msgCount.set(m.sender_id, (msgCount.get(m.sender_id) ?? 0) + 1));
    const postCount = new Map<string, number>();
    (posts24 ?? []).forEach((p: any) => postCount.set(p.author_id, (postCount.get(p.author_id) ?? 0) + 1));
    const adminSet = new Set((adminRoles ?? []).map((r: any) => r.user_id));
    const subMap = new Map<string, any>();
    (subs ?? []).forEach((s: any) => subMap.set(s.user_id, s));

    const rows: AdminUserRow[] = (profiles ?? []).map((p: any) => {
      const auth = emailMap.get(p.id);
      const messages_24h = msgCount.get(p.id) ?? 0;
      const posts_24h = postCount.get(p.id) ?? 0;
      const last_sign_in_at = auth?.last_sign_in_at ?? null;
      const logged_24h = last_sign_in_at && new Date(last_sign_in_at).getTime() > Date.now() - 24 * 3600 * 1000 ? 1 : 0;
      const sub = subMap.get(p.id);
      const reasons: string[] = [];
      if (messages_24h > 200) reasons.push(`${messages_24h} mensagens em 24h`);
      if (posts_24h > 20) reasons.push(`${posts_24h} posts em 24h`);
      if ((p.followers_count ?? 0) === 0 && (p.posts_count ?? 0) > 30) reasons.push("muitos posts sem seguidores");
      if (!auth?.email) reasons.push("sem e-mail registrado");
      const score = reasons.length;
      return {
        id: p.id,
        email: auth?.email ?? null,
        created_at: auth?.created_at ?? null,
        last_sign_in_at,
        full_name: p.full_name,
        username: p.username,
        short_code: p.short_code,
        avatar_url: p.avatar_url,
        followers_count: p.followers_count ?? 0,
        following_count: p.following_count ?? 0,
        posts_count: p.posts_count ?? 0,
        is_plus: !!p.is_plus,
        plus_until: sub?.current_period_end ?? null,
        is_admin: adminSet.has(p.id),
        recent_messages_24h: messages_24h,
        recent_posts_24h: posts_24h,
        recent_logins_24h: logged_24h,
        suspicious_score: score,
        suspicious_reasons: reasons,
      };
    });

    rows.sort((a, b) => b.suspicious_score - a.suspicious_score || b.recent_messages_24h - a.recent_messages_24h);
    return rows;
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [u, p, m, c, plus, active, nu, np, nm] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("chat_messages").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("chats").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("is_plus", true),
      supabaseAdmin.from("chat_messages").select("sender_id", { count: "exact", head: true }).gte("created_at", since24),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since24),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).gte("created_at", since24),
      supabaseAdmin.from("chat_messages").select("id", { count: "exact", head: true }).gte("created_at", since24),
    ]);
    return {
      total_users: u.count ?? 0,
      total_posts: p.count ?? 0,
      total_messages: m.count ?? 0,
      total_chats: c.count ?? 0,
      plus_users: plus.count ?? 0,
      active_24h: active.count ?? 0,
      new_users_24h: nu.count ?? 0,
      new_posts_24h: np.count ?? 0,
      new_messages_24h: nm.count ?? 0,
      suspicious_users: 0,
    };
  });

export const adminGrantPlus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; days: number | null }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Não opere sobre si.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const unlimited = data.days === null;
    const until = unlimited
      ? null
      : new Date(Date.now() + Math.max(1, Math.min(36500, Math.floor(data.days as number))) * 24 * 3600 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        { user_id: data.userId, plan: "plus", status: "active", current_period_end: until, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("sync_profile_is_plus", { _user_id: data.userId } as any);
    return { ok: true, until };
  });

export const adminRevokePlus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Não opere sobre si.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        { user_id: data.userId, plan: "free", status: "inactive", current_period_end: null, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("sync_profile_is_plus", { _user_id: data.userId } as any);
    return { ok: true };
  });

export const adminSetAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; makeAdmin: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Não opere sobre si.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" as const }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Não opere sobre si.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AdminUserDetail = {
  profile: any;
  auth: { email: string | null; created_at: string | null; last_sign_in_at: string | null; phone: string | null; providers: string[]; banned_until: string | null } | null;
  subscription: any | null;
  is_admin: boolean;
  counts: {
    followers: number; following: number; posts: number; messages: number; chats: number;
    likes_given: number; comments: number; statuses: number; notifications: number;
    msgs_24h: number; posts_24h: number;
  };
  recent_posts: any[];
  recent_messages: any[];
  recent_chats: any[];
  notifications: any[];
};

export const adminGetUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }): Promise<AdminUserDetail> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.userId;
    const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [
      { data: profile },
      authRes,
      { data: subscription },
      { data: roleRow },
      followers, following, posts, messages, chatsCnt,
      likes, comments, statuses, notif,
      msgs24, posts24,
      { data: recent_posts },
      { data: recent_messages },
      { data: chatMembersRows },
      { data: notifications },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(uid).catch(() => null as any),
      supabaseAdmin.from("subscriptions").select("*").eq("user_id", uid).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
      supabaseAdmin.from("follows").select("id", { count: "exact", head: true }).eq("following_id", uid),
      supabaseAdmin.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", uid),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).eq("author_id", uid),
      supabaseAdmin.from("chat_messages").select("id", { count: "exact", head: true }).eq("sender_id", uid),
      supabaseAdmin.from("chat_members").select("chat_id", { count: "exact", head: true }).eq("user_id", uid),
      supabaseAdmin.from("post_likes").select("post_id", { count: "exact", head: true }).eq("user_id", uid),
      supabaseAdmin.from("post_comments").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabaseAdmin.from("statuses").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabaseAdmin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabaseAdmin.from("chat_messages").select("id", { count: "exact", head: true }).eq("sender_id", uid).gte("created_at", since24),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).eq("author_id", uid).gte("created_at", since24),
      supabaseAdmin.from("posts").select("id,caption,likes_count,comments_count,created_at").eq("author_id", uid).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("chat_messages").select("id,chat_id,content,message_type,created_at").eq("sender_id", uid).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("chat_members").select("chat_id, chats(id,type,name,last_message,last_message_at)").eq("user_id", uid).limit(20),
      supabaseAdmin.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
    ]);

    const u = (authRes as any)?.data?.user ?? null;
    const recent_chats = (chatMembersRows ?? []).map((m: any) => m.chats).filter(Boolean);

    return {
      profile,
      auth: u ? {
        email: u.email ?? null,
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        phone: u.phone ?? null,
        providers: (u.app_metadata?.providers as string[]) ?? [],
        banned_until: u.banned_until ?? null,
      } : null,
      subscription,
      is_admin: !!roleRow,
      counts: {
        followers: followers.count ?? 0, following: following.count ?? 0,
        posts: posts.count ?? 0, messages: messages.count ?? 0,
        chats: chatsCnt.count ?? 0, likes_given: likes.count ?? 0,
        comments: comments.count ?? 0, statuses: statuses.count ?? 0,
        notifications: notif.count ?? 0,
        msgs_24h: msgs24.count ?? 0, posts_24h: posts24.count ?? 0,
      },
      recent_posts: recent_posts ?? [],
      recent_messages: recent_messages ?? [],
      recent_chats,
      notifications: notifications ?? [],
    };
  });

export const adminSetUserBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; banDurationHours: number | null }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Não opere sobre si.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ban_duration = data.banDurationHours === null
      ? "none"
      : `${Math.max(1, Math.floor(data.banDurationHours))}h`;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; newPassword: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Não opere sobre si.");
    if (!data.newPassword || data.newPassword.length < 6) throw new Error("Senha mínima 6 caracteres");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.newPassword });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// 🔒 ULTRA-SECRET — Visão total de TODAS as conversas
// Só executa via servidor com a chave de serviço.
// O acesso é gateado por assertAdmin (env JTC_ADMIN_EMAIL).
// ============================================================

export type AdminChatListItem = {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string | null;
  members_count: number;
  messages_count: number;
  members: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }[];
};

export const adminListAllChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<AdminChatListItem[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data.limit ?? 200, 1), 500);

    const { data: chats, error } = await supabaseAdmin
      .from("chats")
      .select("id,type,name,avatar_url,last_message,last_message_at,created_at")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const list = chats ?? [];
    if (!list.length) return [];

    const ids = list.map((c: any) => c.id);
    const [{ data: members }, msgCounts] = await Promise.all([
      supabaseAdmin
        .from("chat_members")
        .select("chat_id,user_id, profiles!inner(id,full_name,username,avatar_url)")
        .in("chat_id", ids),
      Promise.all(
        ids.map((id) =>
          supabaseAdmin
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("chat_id", id)
            .then((r) => ({ id, count: r.count ?? 0 })),
        ),
      ),
    ]);

    const msgMap = new Map(msgCounts.map((m) => [m.id, m.count]));
    const memberMap = new Map<string, AdminChatListItem["members"]>();
    (members ?? []).forEach((m: any) => {
      const arr = memberMap.get(m.chat_id) ?? [];
      if (m.profiles) {
        arr.push({
          id: m.profiles.id,
          full_name: m.profiles.full_name,
          username: m.profiles.username,
          avatar_url: m.profiles.avatar_url,
        });
      }
      memberMap.set(m.chat_id, arr);
    });

    const rows: AdminChatListItem[] = list.map((c: any) => {
      const ms = memberMap.get(c.id) ?? [];
      return {
        id: c.id,
        type: c.type,
        name: c.name,
        avatar_url: c.avatar_url,
        last_message: c.last_message,
        last_message_at: c.last_message_at,
        created_at: c.created_at,
        members_count: ms.length,
        messages_count: msgMap.get(c.id) ?? 0,
        members: ms,
      };
    });

    const search = (data.search ?? "").trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((r) => {
      if (r.name && r.name.toLowerCase().includes(search)) return true;
      if (r.last_message && r.last_message.toLowerCase().includes(search)) return true;
      return r.members.some(
        (m) =>
          (m.full_name ?? "").toLowerCase().includes(search) ||
          (m.username ?? "").toLowerCase().includes(search),
      );
    });
  });

export type AdminChatThreadMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  duration_ms: number | null;
  created_at: string;
  sender: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export type AdminChatThread = {
  chat: AdminChatListItem;
  messages: AdminChatThreadMessage[];
};

export const adminGetChatThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chatId: string; limit?: number }) => input)
  .handler(async ({ data, context }): Promise<AdminChatThread> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data.limit ?? 500, 1), 2000);

    const { data: chat, error: cErr } = await supabaseAdmin
      .from("chats")
      .select("id,type,name,avatar_url,last_message,last_message_at,created_at")
      .eq("id", data.chatId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!chat) throw new Error("Conversa não encontrada");

    const [{ data: members }, { data: messages, error: mErr }] = await Promise.all([
      supabaseAdmin
        .from("chat_members")
        .select("user_id, profiles!inner(id,full_name,username,avatar_url)")
        .eq("chat_id", data.chatId),
      supabaseAdmin
        .from("chat_messages")
        .select("id,chat_id,sender_id,content,message_type,media_url,duration_ms,created_at")
        .eq("chat_id", data.chatId)
        .order("created_at", { ascending: true })
        .limit(limit),
    ]);
    if (mErr) throw new Error(mErr.message);

    const memberList = (members ?? [])
      .map((m: any) => m.profiles)
      .filter(Boolean) as AdminChatListItem["members"];
    const senderMap = new Map(memberList.map((p) => [p.id, p]));

    return {
      chat: {
        id: chat.id,
        type: chat.type,
        name: chat.name,
        avatar_url: chat.avatar_url,
        last_message: chat.last_message,
        last_message_at: chat.last_message_at,
        created_at: chat.created_at,
        members_count: memberList.length,
        messages_count: (messages ?? []).length,
        members: memberList,
      },
      messages: (messages ?? []).map((m: any) => ({
        ...m,
        sender: senderMap.get(m.sender_id) ?? null,
      })),
    };
  });

