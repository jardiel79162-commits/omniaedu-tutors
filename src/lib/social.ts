import { supabase } from "@/integrations/supabase/client";

export type ProfileLite = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type PostMedia = {
  id: string;
  url: string;
  mime: string;
  position: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
};

export type ProductLink = {
  id: string;
  post_id: string;
  media_position: number;
  url: string;
  label: string | null;
  logo_url: string | null;
  x: number;
  y: number;
  size: number;
};

export type PostVisibility = "public" | "followers" | "private";

export type Post = {
  id: string;
  author_id: string;
  kind: "photo" | "reel";
  caption: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  visibility?: PostVisibility;
  author?: ProfileLite | null;
  media?: PostMedia[];
  links?: ProductLink[];
  liked_by_me?: boolean;
};

export function extractHashtags(text: string): string[] {
  const out = new Set<string>();
  const re = /#([\p{L}\p{N}_]{1,40})/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1].toLowerCase());
  return Array.from(out);
}

export async function followUser(targetId: string) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("Não autenticado");
  if (uid === targetId) throw new Error("Você não pode seguir a si mesmo");
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: uid, following_id: targetId });
  if (error && !String(error.message).includes("duplicate")) throw error;
}

export async function unfollowUser(targetId: string) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", uid)
    .eq("following_id", targetId);
  if (error) throw error;
}

export async function isFollowing(targetId: string): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return false;
  const { data: row } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", uid)
    .eq("following_id", targetId)
    .maybeSingle();
  return !!row;
}

export async function likePost(postId: string) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return;
  await supabase.from("post_likes").insert({ post_id: postId, user_id: uid });
}

export async function unlikePost(postId: string) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return;
  await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", uid);
}

export async function deletePost(postId: string) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("Não autenticado");
  // Best-effort delete of dependent rows (RLS will allow author).
  await supabase.from("post_media").delete().eq("post_id", postId);
  await supabase.from("post_likes").delete().eq("post_id", postId);
  await supabase.from("post_comments").delete().eq("post_id", postId);
  await supabase.from("post_saves").delete().eq("post_id", postId);
  await supabase.from("post_hashtags").delete().eq("post_id", postId);
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", uid);
  if (error) throw error;
}

export async function updatePostCaption(postId: string, caption: string) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("Não autenticado");
  const { error } = await supabase
    .from("posts")
    .update({ caption })
    .eq("id", postId)
    .eq("author_id", uid);
  if (error) throw error;
}

export async function fetchPostLikes(postId: string, limit = 100): Promise<ProfileLite[]> {
  const { data: likes } = await supabase
    .from("post_likes")
    .select("user_id, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = (likes ?? []).map((r: any) => r.user_id);
  if (!ids.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id,full_name,username,avatar_url")
    .in("id", ids);
  const map = new Map<string, ProfileLite>();
  (profs ?? []).forEach((p: any) => map.set(p.id, p));
  return ids.map((id: string) => map.get(id)).filter(Boolean) as ProfileLite[];
}

/** Hydrates posts with author + media + liked_by_me */
export async function hydratePosts(rows: Post[]): Promise<Post[]> {
  if (!rows.length) return [];
  const { data: ses } = await supabase.auth.getSession();
  const uid = ses.session?.user?.id ?? null;
  const ids = rows.map((p) => p.id);
  const authorIds = Array.from(new Set(rows.map((p) => p.author_id)));

  const [{ data: authors }, { data: media }, { data: likes }, { data: links }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,username,avatar_url").in("id", authorIds),
    supabase
      .from("post_media")
      .select("id,post_id,url,mime,position,width,height,duration_ms")
      .in("post_id", ids)
      .order("position"),
    uid
      ? supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", uid)
      : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
    supabase
      .from("post_links" as any)
      .select("id,post_id,media_position,url,label,logo_url,x,y,size")
      .in("post_id", ids),
  ]);

  const authorMap = new Map<string, ProfileLite>();
  (authors ?? []).forEach((a: any) => authorMap.set(a.id, a));
  const mediaMap = new Map<string, PostMedia[]>();
  (media ?? []).forEach((m: any) => {
    const arr = mediaMap.get(m.post_id) ?? [];
    arr.push(m);
    mediaMap.set(m.post_id, arr);
  });
  const linksMap = new Map<string, ProductLink[]>();
  (links ?? []).forEach((l: any) => {
    const arr = linksMap.get(l.post_id) ?? [];
    arr.push(l as ProductLink);
    linksMap.set(l.post_id, arr);
  });
  const likedSet = new Set((likes ?? []).map((l: any) => l.post_id));

  return rows.map((p) => ({
    ...p,
    author: authorMap.get(p.author_id) ?? null,
    media: mediaMap.get(p.id) ?? [],
    links: linksMap.get(p.id) ?? [],
    liked_by_me: likedSet.has(p.id),
  }));
}

/** Apply visibility filter based on viewer following relationship */
async function filterByVisibility(rows: Post[]): Promise<Post[]> {
  const { data: ses } = await supabase.auth.getSession();
  const uid = ses.session?.user?.id ?? null;
  if (!uid) return rows.filter((p) => (p.visibility ?? "public") === "public");

  const restrictedAuthors = Array.from(
    new Set(rows.filter((p) => (p.visibility ?? "public") === "followers" && p.author_id !== uid).map((p) => p.author_id)),
  );
  let followsAuthors = new Set<string>();
  if (restrictedAuthors.length) {
    const { data: f } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", uid)
      .in("following_id", restrictedAuthors);
    followsAuthors = new Set((f ?? []).map((r: any) => r.following_id));
  }
  return rows.filter((p) => {
    const v = p.visibility ?? "public";
    if (v === "public") return true;
    if (p.author_id === uid) return true;
    if (v === "followers") return followsAuthors.has(p.author_id);
    return false; // private
  });
}

/** Round-robin interleave so consecutive posts come from different authors (Instagram-like). */
function interleaveByAuthor(rows: Post[]): Post[] {
  const groups = new Map<string, Post[]>();
  for (const p of rows) {
    const arr = groups.get(p.author_id) ?? [];
    arr.push(p);
    groups.set(p.author_id, arr);
  }
  // Preserve newest-first within each author group (rows already sorted desc).
  const buckets = Array.from(groups.values());
  const out: Post[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const b of buckets) {
      const next = b.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

export async function fetchFeed(opts?: { kind?: "photo" | "reel"; limit?: number; before?: string }) {
  const limit = opts?.limit ?? 20;
  let q = supabase
    .from("posts")
    .select("id,author_id,kind,caption,likes_count,comments_count,created_at,visibility")
    .order("created_at", { ascending: false })
    .limit(limit * 3); // fetch extra to compensate for visibility filtering + interleaving
  if (opts?.kind) q = q.eq("kind", opts.kind);
  if (opts?.before) q = q.lt("created_at", opts.before);
  const { data, error } = await q;
  if (error) throw error;
  const visible = await filterByVisibility((data ?? []) as Post[]);
  const interleaved = interleaveByAuthor(visible);
  return hydratePosts(interleaved.slice(0, limit));
}

export async function fetchUserPosts(authorId: string, kind?: "photo" | "reel") {
  let q = supabase
    .from("posts")
    .select("id,author_id,kind,caption,likes_count,comments_count,created_at,visibility")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  const visible = await filterByVisibility((data ?? []) as Post[]);
  return hydratePosts(visible);
}

/** Returns the set of author ids (from the given list) that posted a photo in the last `hours` hours. */
export async function recentPostAuthors(authorIds: string[], hours = 24): Promise<Set<string>> {
  if (!authorIds.length) return new Set();
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("posts")
    .select("author_id")
    .in("author_id", authorIds)
    .eq("kind", "photo")
    .gte("created_at", since);
  return new Set((data ?? []).map((r: any) => r.author_id));
}

export async function sendConversationRequest(toId: string, message = "") {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("Não autenticado");

  const { data: existing } = await supabase.rpc("ensure_direct_chat" as any, {
    _requester_id: uid,
    _addressee_id: toId,
  } as any);
  void existing;

  const { error } = await supabase
    .from("conversation_requests")
    .upsert(
      { from_id: uid, to_id: toId, status: "pending", message },
      { onConflict: "from_id,to_id" },
    );
  if (error) throw error;
}
