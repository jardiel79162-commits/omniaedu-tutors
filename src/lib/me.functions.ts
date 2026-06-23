import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyBanStatus = {
  banned: boolean;
  banned_until: string | null;
};

export const getMyBanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyBanStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error || !data?.user) return { banned: false, banned_until: null };
    const bu = (data.user as any).banned_until as string | null | undefined;
    if (!bu) return { banned: false, banned_until: null };
    const t = new Date(bu).getTime();
    if (!Number.isFinite(t) || t <= Date.now()) return { banned: false, banned_until: null };
    return { banned: true, banned_until: bu };
  });
