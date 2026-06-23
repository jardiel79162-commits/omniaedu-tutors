import { supabase } from "@/integrations/supabase/client";
import { hydratePosts, type Post } from "@/lib/social";

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  is_private: boolean;
  cover_url: string | null;
  created_at: string;
  count?: number;
};

async function uid() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function isSaved(postId: string): Promise<boolean> {
  const u = await uid();
  if (!u) return false;
  const { data } = await (supabase as any)
    .from("post_saves")
    .select("post_id")
    .eq("user_id", u)
    .eq("post_id", postId)
    .maybeSingle();
  return !!data;
}

export async function savePost(postId: string, collectionId?: string | null) {
  const u = await uid();
  if (!u) throw new Error("Não autenticado");
  const { error } = await (supabase as any)
    .from("post_saves")
    .upsert(
      { user_id: u, post_id: postId, collection_id: collectionId ?? null },
      { onConflict: "user_id,post_id" },
    );
  if (error) throw error;
}

export async function unsavePost(postId: string) {
  const u = await uid();
  if (!u) throw new Error("Não autenticado");
  const { error } = await (supabase as any)
    .from("post_saves")
    .delete()
    .eq("user_id", u)
    .eq("post_id", postId);
  if (error) throw error;
}

export async function listCollections(): Promise<Collection[]> {
  const u = await uid();
  if (!u) return [];
  const { data } = await (supabase as any)
    .from("collections")
    .select("*")
    .eq("user_id", u)
    .order("created_at", { ascending: false });
  return (data ?? []) as Collection[];
}

export async function createCollection(name: string): Promise<Collection> {
  const u = await uid();
  if (!u) throw new Error("Não autenticado");
  const { data, error } = await (supabase as any)
    .from("collections")
    .insert({ user_id: u, name })
    .select()
    .single();
  if (error) throw error;
  return data as Collection;
}

export async function deleteCollection(id: string) {
  const { error } = await (supabase as any).from("collections").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchSavedPosts(collectionId?: string | null): Promise<Post[]> {
  const u = await uid();
  if (!u) return [];
  let q = (supabase as any)
    .from("post_saves")
    .select("post_id, collection_id, created_at")
    .eq("user_id", u)
    .order("created_at", { ascending: false });
  if (collectionId === null) q = q.is("collection_id", null);
  else if (collectionId) q = q.eq("collection_id", collectionId);
  const { data: saves } = await q;
  const ids = (saves ?? []).map((s: any) => s.post_id);
  if (!ids.length) return [];
  const { data: posts } = await supabase
    .from("posts")
    .select("id,author_id,kind,caption,likes_count,comments_count,created_at")
    .in("id", ids);
  const order = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
  const sorted = (posts ?? []).sort(
    (a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
  return hydratePosts(sorted as Post[]);
}
