import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Palette, Image as ImageIcon, MessageSquare, Type, MousePointer2, AlignJustify, Sparkles, Circle, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plus/personalizar")({
  component: Layout,
});

const CATS = [
  { id: "tema", icon: Palette, title: "Tema do app", desc: "Paletas para selo, anel de story e seu nome." },
  { id: "fundo", icon: ImageIcon, title: "Fundo de conversa", desc: "Planos de fundo exclusivos para os chats." },
  { id: "balao", icon: MessageSquare, title: "Formato dos balões", desc: "Estilo das mensagens enviadas." },
  { id: "fonte", icon: Type, title: "Fonte do seu nome", desc: "Tipografias para chats, perfil e posts." },
  { id: "tamanho", icon: AlignJustify, title: "Tamanho do chat", desc: "Densidade do texto nas conversas." },
  { id: "cursor", icon: MousePointer2, title: "Cursor exclusivo", desc: "Estilo do cursor no PC." },
  { id: "aura", icon: Sparkles, title: "Brilho do perfil", desc: "Aura animada na sua foto de perfil." },
  { id: "anel", icon: Circle, title: "Anel dos stories", desc: "Borda colorida ao redor do seu story." },
  { id: "capa", icon: Layers, title: "Capa do perfil", desc: "Banner gradiente no topo do seu perfil." },
] as const;

function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/plus/personalizar") return <Outlet />;
  return <Menu />;
}

function Menu() {
  return (
    <div className="flex flex-col h-dvh lg:h-full bg-background">
      <header className="shrink-0 backdrop-blur bg-background/85 border-b">
        <div className="flex items-center gap-2 p-3">
          <Link to="/plus" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-base font-semibold">Personalização Plus</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto p-3 lg:p-6 pb-32 space-y-2">
          {CATS.map(({ id, icon: Icon, title, desc }) => (
            <Link
              key={id}
              to="/plus/personalizar/$cat"
              params={{ cat: id }}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border hover:bg-muted/50 active:scale-[0.99] transition"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
