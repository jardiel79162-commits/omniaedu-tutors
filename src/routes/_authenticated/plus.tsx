import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Crown, Infinity as InfinityIcon, Users, Clock, Sparkles, Download, ChevronRight, Palette, BookmarkPlus } from "lucide-react";
import { usePlus } from "@/lib/use-plus";

export const Route = createFileRoute("/_authenticated/plus")({
  component: PlusLayout,
});

const PRICE_BRL = 19.9;

function PlusLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/plus") return <Outlet />;
  return <PlusPage />;
}

function PlusPage() {
  const { isPlus, expiresAt } = usePlus();
  const navigate = useNavigate();

  const benefits = [
    { icon: BadgeCheck, title: "Selo verificado azul", desc: "Selo oficial ao lado do seu nome em chats, perfil, posts e stories." },
    { icon: InfinityIcon, title: "Arquivos e mídias ilimitados", desc: "Fotos e vídeos sem limite e até 10 mídias por post." },
    { icon: Users, title: "Grupos com até 2.000 pessoas", desc: "Free permite até 500 participantes." },
    { icon: Clock, title: "Stories por até 30 dias", desc: "24h, 7 ou 30 dias. Free só tem 24h." },
    { icon: Download, title: "Baixar stories de outras pessoas", desc: "Salve qualquer story que aparecer no feed." },
    { icon: Sparkles, title: "Personalização total", desc: "Temas, fundos, balões, fontes, cursor, anel de stories, capa de perfil e mais." },
  ];

  const menu = [
    { to: "/plus/personalizar", icon: Palette, title: "Personalização Plus", desc: "Tema, fundo de conversa, balões, fontes e muito mais." },
    { to: "/plus/reservados", icon: BookmarkPlus, title: "Usernames reservados", desc: "Reserve e gerencie @usernames vinculados à sua conta." },
  ] as const;

  return (
    <div className="flex flex-col h-dvh lg:h-full bg-background">
      <header className="shrink-0 backdrop-blur bg-background/85 border-b">
        <div className="flex items-center gap-2 p-3">
          <Link to="/profile" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-base font-semibold">Peacely PLUS</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto p-4 lg:p-8 pb-32 lg:pb-12 space-y-5">
          <div className="relative overflow-hidden rounded-3xl p-6 lg:p-10 text-white shadow-xl"
               style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)" }}>
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <Crown className="h-10 w-10 mb-3" />
            <div className="text-3xl lg:text-4xl font-extrabold leading-tight">Vire PLUS.</div>
            <div className="text-sm lg:text-base opacity-90 mt-2 max-w-md">
              Desbloqueie tudo do app — selo verificado, arquivos ilimitados, grupos enormes, personalização completa e mais.
            </div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl lg:text-5xl font-extrabold">R$ {PRICE_BRL.toFixed(2).replace(".", ",")}</span>
              <span className="text-sm opacity-80">/mês</span>
            </div>
            {isPlus ? (
              <div className="mt-5 px-4 py-2.5 rounded-xl bg-white/20 text-sm font-semibold inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" /> Você já é PLUS
                {expiresAt && <span className="opacity-80 font-normal">· até {new Date(expiresAt).toLocaleDateString("pt-BR")}</span>}
              </div>
            ) : (
              <button onClick={() => navigate({ to: "/plus/checkout" })}
                className="mt-5 h-12 px-6 rounded-xl bg-white text-indigo-700 font-bold shadow-lg active:scale-[0.98] transition w-full sm:w-auto">
                Assinar INTERLINK PLUS
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-3.5 rounded-2xl bg-card border">
                <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground px-1 font-semibold">Sua conta Plus</h2>
            {menu.map(({ to, icon: Icon, title, desc }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border hover:bg-muted/50 active:scale-[0.99] transition">
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

          <p className="text-[11px] text-muted-foreground text-center px-4">
            Pagamento 100% no app via Pix ou cartão. Cancele quando quiser.
          </p>
        </div>
      </div>
    </div>
  );
}
