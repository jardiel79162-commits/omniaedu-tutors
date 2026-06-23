import { createFileRoute } from "@tanstack/react-router";

// Idempotently provisions the configured admin account.
// Reads JTC_ADMIN_EMAIL + JTC_ADMIN_PASSWORD from server secrets and
// ensures an auth user exists with that login + admin role.
// Never returns the credentials; only a short status string.
export const Route = createFileRoute("/api/public/admin-bootstrap")({
  server: {
    handlers: {
      GET: async () => {
        const email = process.env.JTC_ADMIN_EMAIL?.trim().toLowerCase();
        const password = process.env.JTC_ADMIN_PASSWORD;
        if (!email || !password) {
          return new Response(JSON.stringify({ ok: false }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Try to find an existing auth user with this email.
          let found: { id: string } | null = null;
          for (let page = 1; page < 10 && !found; page++) {
            const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
            const list = data?.users ?? [];
            const u = list.find((x) => (x.email || "").toLowerCase() === email);
            if (u) found = { id: u.id };
            if (list.length < 200) break;
          }

          let userId = found?.id ?? null;
          if (!userId) {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: { full_name: "Administrador JTC" },
            });
            if (error) throw error;
            userId = data.user?.id ?? null;
          } else {
            // Always sync password + confirm to the configured values.
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              password,
              email_confirm: true,
            });
          }

          if (userId) {
            await supabaseAdmin
              .from("user_roles")
              .upsert(
                { user_id: userId, role: "admin" as const },
                { onConflict: "user_id,role" },
              );
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          console.error("admin-bootstrap failed", err);
          return new Response(JSON.stringify({ ok: false }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
