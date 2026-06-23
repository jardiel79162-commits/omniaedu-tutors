import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cache, getCurrentUserId } from "@/lib/app-cache";
import { bootPlusSettings } from "@/lib/plus-settings";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="app-shell items-center justify-center text-center px-6">
      <div className="my-auto">
        <div className="text-6xl font-bold bg-gradient-brand bg-clip-text text-transparent">
          404
        </div>
        <p className="mt-3 text-muted-foreground">Página não encontrada.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Voltar
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <div className="app-shell items-center justify-center text-center px-6">
      <div className="my-auto">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { name: "theme-color", content: "#1f8f5e" },
      { title: "Peacely" },
      {
        name: "description",
        content: "Peacely — converse, compartilhe status e crie grupos.",
      },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:title", content: "Peacely" },
      { name: "twitter:title", content: "Peacely" },
      {
        property: "og:description",
        content: "Peacely — converse, compartilhe status e crie grupos.",
      },
      {
        name: "twitter:description",
        content: "Peacely — converse, compartilhe status e crie grupos.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/c5618d25-f0da-4aae-ac70-158cd49e14b1",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/c5618d25-f0da-4aae-ac70-158cd49e14b1",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { name: "description", content: "Peacely is a WhatsApp-integrated CRM for managing contacts and conversations." },
      { property: "og:description", content: "Peacely is a WhatsApp-integrated CRM for managing contacts and conversations." },
      { name: "twitter:description", content: "Peacely is a WhatsApp-integrated CRM for managing contacts and conversations." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/799f11a9-1adc-484f-b3b1-236376ab56bf/id-preview-50d61761--8a2b57ba-ffd7-4700-b250-a9efd46c83bb.lovable.app-1782185928420.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/799f11a9-1adc-484f-b3b1-236376ab56bf/id-preview-50d61761--8a2b57ba-ffd7-4700-b250-a9efd46c83bb.lovable.app-1782185928420.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&family=Fira+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;900&family=Bebas+Neue&family=Pacifico&family=Caveat:wght@600;700&family=Permanent+Marker&family=Bangers&family=Anton&family=Dancing+Script:wght@700&family=Oswald:wght@600;700&family=Righteous&family=Lobster&family=Press+Start+2P&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Block right-click / drag / save-image globally to behave like a native app.
  if (typeof window !== "undefined") {
    // Idempotent — attach once.
    const w = window as any;
    if (!w.__jtcGuards) {
      w.__jtcGuards = true;
      window.addEventListener("contextmenu", (e) => {
        const t = e.target as HTMLElement | null;
        if (!t) return;
        // Allow context menu inside editable fields
        if (t.closest('input, textarea, [contenteditable="true"]')) return;
        e.preventDefault();
      });
      window.addEventListener("dragstart", (e) => {
        const t = e.target as HTMLElement | null;
        if (t && t.tagName === "IMG") e.preventDefault();
      });
    }
  }
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}

function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    // Apply Plus customization after hydration to avoid SSR/client mismatch
    // on <html> attributes (which previously caused a blank page).
    void bootPlusSettings();
    // Eagerly authenticate Realtime so subscriptions opened by any page
    // receive RLS-gated events without waiting for an auth event.
    supabase.auth.getSession().then(({ data }) => {
      supabase.realtime.setAuth(data.session?.access_token ?? "");
    });
    getCurrentUserId().then((uid) => {
      cache.setUser(uid);
      if (uid) prefetchSelfProfile(uid);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      supabase.realtime.setAuth(session?.access_token ?? "");
      cache.setUser(uid);
      if (uid) prefetchSelfProfile(uid);
      if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        queryClient.clear();
        router.invalidate();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

async function prefetchSelfProfile(uid: string) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    supabase.realtime.setAuth(sessionData.session?.access_token ?? "");
    const email = sessionData.session?.user?.email ?? "";
    const { data } = await supabase
      .from("profiles")
      .select(
        "full_name,username,about,short_code,avatar_url,followers_count,following_count,posts_count",
      )
      .eq("id", uid)
      .maybeSingle();
    cache.set("profile", {
      email,
      fullName: data?.full_name ?? "",
      username: data?.username ?? "",
      about: data?.about ?? "",
      shortCode: (data as any)?.short_code ?? "",
      avatarUrl: (data as any)?.avatar_url ?? null,
      followers: (data as any)?.followers_count ?? 0,
      following: (data as any)?.following_count ?? 0,
      posts: (data as any)?.posts_count ?? 0,
    });
  } catch {}
}
