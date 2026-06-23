import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";

export async function fetchNicknames(contactIds: string[]): Promise<Record<string, string>> {
  if (!contactIds.length) return {};
  const me = await getCurrentUserId();
  if (!me) return {};
  const { data } = await supabase
    .from("contact_nicknames")
    .select("contact_id,nickname")
    .eq("owner_id", me)
    .in("contact_id", contactIds);
  const map: Record<string, string> = {};
  ((data ?? []) as Array<{ contact_id: string; nickname: string }>).forEach((r) => {
    if (r.nickname?.trim()) map[r.contact_id] = r.nickname.trim();
  });
  return map;
}

export async function saveNickname(contactId: string, nickname: string): Promise<void> {
  const me = await getCurrentUserId();
  if (!me) throw new Error("not authenticated");
  const trimmed = nickname.trim();
  if (!trimmed) {
    await supabase
      .from("contact_nicknames")
      .delete()
      .eq("owner_id", me)
      .eq("contact_id", contactId);
    return;
  }
  const { error } = await supabase
    .from("contact_nicknames")
    .upsert(
      { owner_id: me, contact_id: contactId, nickname: trimmed },
      { onConflict: "owner_id,contact_id" },
    );
  if (error) throw error;
}
