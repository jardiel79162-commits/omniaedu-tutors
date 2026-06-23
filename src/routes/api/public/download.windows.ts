import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/download/windows")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("downloads")
          .createSignedUrl("JTC-INTERLINK-windows-x64.zip", 60 * 10, {
            download: "JTC-INTERLINK-windows-x64.zip",
          });
        if (error || !data?.signedUrl) {
          return new Response("Arquivo indisponível", { status: 500 });
        }
        return new Response(null, {
          status: 302,
          headers: { Location: data.signedUrl },
        });
      },
    },
  },
});
