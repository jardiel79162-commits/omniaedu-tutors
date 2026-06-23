import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PRIVATE_BUCKETS = ["chat-media", "voice-messages", "status-media"];
const cache = new Map<string, { url: string; exp: number }>();

function parseStorageUrl(input: string): { bucket: string; path: string } | null {
  const raw = input.trim();
  // Matches /object/public/{bucket}/{path}, /object/sign/{bucket}/{path},
  // and /object/authenticated/{bucket}/{path}. Also accepts stored raw refs
  // like "chat-media/chat-id/user-id/file.jpg".
  const urlMatch = raw.match(
    /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/,
  );
  if (urlMatch) return { bucket: urlMatch[1], path: decodeURIComponent(urlMatch[2]) };

  const rawMatch = raw.match(/^([a-z0-9-]+)\/(.+)$/i);
  if (rawMatch && PRIVATE_BUCKETS.includes(rawMatch[1])) {
    return { bucket: rawMatch[1], path: rawMatch[2] };
  }

  return null;
}

export async function resolveMediaUrl(
  input: string | null | undefined,
  opts?: { refresh?: boolean },
): Promise<string> {
  if (!input) return "";
  // Local blob/object URLs pass through
  if (input.startsWith("blob:") || input.startsWith("data:")) return input;
  const parsed = parseStorageUrl(input);
  if (!parsed || !PRIVATE_BUCKETS.includes(parsed.bucket)) return input;
  const key = `${parsed.bucket}/${parsed.path}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (!opts?.refresh && hit && hit.exp > now + 30_000) return hit.url;
  await supabase.auth.getSession().catch(() => null);
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 3600);
  if (error || !data?.signedUrl) return "";
  cache.set(key, { url: data.signedUrl, exp: now + 3600_000 });
  return data.signedUrl;
}

export function useMediaUrl(input: string | null | undefined, refreshKey = 0): string {
  const [url, setUrl] = useState<string>(() => {
    if (!input) return "";
    if (input.startsWith("blob:") || input.startsWith("data:")) return input;
    return "";
  });
  useEffect(() => {
    let alive = true;
    if (input?.startsWith("blob:") || input?.startsWith("data:")) setUrl(input);
    else setUrl("");
    (async () => {
      for (let attempt = 0; attempt < 6 && alive; attempt += 1) {
        const u = await resolveMediaUrl(input, { refresh: refreshKey > 0 || attempt > 0 });
        if (!alive) return;
        if (u) {
          setUrl(u);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250 + attempt * 250));
      }
      if (alive) setUrl("");
    })();
    return () => {
      alive = false;
    };
  }, [input, refreshKey]);
  return url;
}
