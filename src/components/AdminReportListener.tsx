import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { showAppNotification } from "@/lib/notifications";

/**
 * Mounted globally inside the authenticated layout.
 * If the current user is an admin, subscribes to their `notifications` rows
 * and shows a heads-up + (optional) OS notification for `report_new` and
 * `report_supervision` events the moment they hit the DB.
 */
export function AdminReportListener() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = await getCurrentUserId();
      if (!uid) return;
      const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" } as any);
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let uid: string | null = null;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      uid = await getCurrentUserId();
      if (!uid) return;
      ch = supabase
        .channel(`admin-notif-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          async ({ new: n }: any) => {
            if (!n || (n.type !== "report_new" && n.type !== "report_supervision")) return;
            const isSup = n.type === "report_supervision";
            const title = isSup ? "⚠️ Ultra supervisão" : "🚨 Nova denúncia";
            let body = isSup
              ? "Um usuário atingiu 10 denúncias e entrou em supervisão."
              : "Uma nova denúncia foi enviada.";
            try {
              if (n.actor_id) {
                const { data: p } = await supabase
                  .from("profiles")
                  .select("full_name,username")
                  .eq("id", n.actor_id)
                  .maybeSingle();
                const who = p?.full_name || p?.username || "Alguém";
                body = isSup ? `${who} denunciou — usuário sob supervisão.` : `${who} enviou uma denúncia.`;
              }
            } catch {}
            showAppNotification(title, body, {
              tag: `admin-report-${n.id}`,
              onClick: () => navigate({ to: "/admin/reports" }),
            });
          },
        )
        .subscribe();
    })();
    return () => {
      if (ch) supabase.removeChannel(ch);
    };
  }, [isAdmin, navigate]);

  return null;
}
