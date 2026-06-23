import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  MessageCircle,
  Users,
  Camera,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Phone,
  Send,
  Mic,
  Video,
  Heart,
  Globe2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/feed" });
    try {
      if (localStorage.getItem("jtc:seen-welcome") === "1") {
        throw redirect({ to: "/login" });
      }
    } catch (e: any) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  head: () => ({
    meta: [
      { title: "Peacely — Conversas em tempo real" },
      {
        name: "description",
        content:
          "Mensagens, áudio, vídeo, status e grupos com privacidade real. Conecte-se com sua comunidade no Peacely.",
      },
      { property: "og:title", content: "Peacely" },
      {
        property: "og:description",
        content: "Conversas, status e grupos. Tudo num lugar, em tempo real.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem("jtc:seen-welcome", "1"); } catch {}
  }
  return (
    <>
      <MobileLanding />
      <DesktopLanding />
    </>
  );
}

/* ===================== MOBILE ===================== */
function MobileLanding() {
  return (
    <div className="md:hidden min-h-[100dvh] bg-background text-foreground relative overflow-hidden">
      {/* aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/35 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 h-[24rem] w-[24rem] rounded-full bg-primary/20 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      {/* top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-gradient-brand grid place-items-center shadow-soft">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-[13px] font-bold tracking-[0.18em]">Peacely</span>
        </div>
        <Link
          to="/login"
          preload="intent"
          className="text-[12px] font-semibold text-muted-foreground inline-flex items-center gap-1"
        >
          Entrar <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* HERO — editorial */}
      <section className="relative z-10 px-5 pt-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 backdrop-blur px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary ring-1 ring-primary/25">
          <Sparkles className="h-3 w-3" /> v.2026
        </span>

        <h1 className="mt-5 font-display font-black tracking-[-0.04em] text-[3.4rem] leading-[0.92]">
          Fale.
          <br />
          <span className="italic font-serif text-primary">Conecte.</span>
          <br />
          Pertença.
        </h1>

        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground max-w-[20rem]">
          A rede das suas conversas reais — mensagens, voz, vídeo e momentos,
          em tempo real, sem ruído.
        </p>

        {/* floating chat card */}
        <div className="relative mt-9">
          <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-gradient-brand opacity-25 blur-2xl" />
          <PhoneCard />
        </div>
      </section>

      {/* feature strip */}
      <section className="relative z-10 px-5 mt-12">
        <div className="text-[10px] uppercase tracking-[0.28em] text-primary font-bold">o essencial</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <FeatureTile icon={<Send className="h-4 w-4" />} title="Tempo real" sub="Mensagens instantâneas" />
          <FeatureTile icon={<Video className="h-4 w-4" />} title="HD calls" sub="Voz e vídeo nativos" />
          <FeatureTile icon={<Camera className="h-4 w-4" />} title="Status 24h" sub="Momentos que somem" />
          <FeatureTile icon={<Users className="h-4 w-4" />} title="Grupos" sub="Comunidades vivas" />
        </div>
      </section>

      {/* numbers */}
      <section className="relative z-10 px-5 mt-12">
        <div className="rounded-3xl border border-border bg-card/60 backdrop-blur p-5 grid grid-cols-3 gap-2 text-center">
          <MiniStat value="<50ms" label="latência" />
          <MiniStat value="100%" label="privado" />
          <MiniStat value="24/7" label="online" />
        </div>
      </section>

      {/* CTA + sticky dock */}
      <section className="relative z-10 px-5 mt-12 pb-40">
        <div className="rounded-3xl bg-gradient-brand p-6 text-primary-foreground shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--primary)_55%,transparent)]">
          <Heart className="h-5 w-5" />
          <h3 className="mt-3 font-display text-2xl font-black leading-tight">
            Sua comunidade está te esperando.
          </h3>
          <p className="mt-2 text-sm opacity-90">
            Crie sua conta grátis em segundos. Sem anúncios, sem rastreio.
          </p>
        </div>

        <p className="mt-8 text-[11px] text-muted-foreground text-center">
          © {new Date().getFullYear()} Peacely · Feito para você se conectar.
        </p>
      </section>

      {/* sticky bottom dock */}
      <div className="fixed bottom-0 inset-x-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="flex gap-2">
          <Link
            to="/login"
            search={{ mode: "signup" }}
            preload="intent"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-soft active:opacity-90"
          >
            Criar conta
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            preload="intent"
            className="rounded-full bg-secondary px-5 py-3.5 text-sm font-bold text-secondary-foreground active:opacity-90"
          >
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}

function PhoneCard() {
  return (
    <div className="relative rounded-[2rem] border border-border bg-card/80 backdrop-blur-xl overflow-hidden shadow-card">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-background/40">
        <div className="h-9 w-9 rounded-full bg-gradient-brand grid place-items-center text-white text-sm font-black">A</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold truncate">Ana · Time JTC</div>
          <div className="text-[10px] text-primary flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            online agora
          </div>
        </div>
        <Phone className="h-4 w-4 text-muted-foreground" />
        <Video className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="p-4 space-y-2.5 bg-gradient-hero">
        <Bubble side="left">Oi! Viu a nova função de status? 🎥</Bubble>
        <Bubble side="right">Vi sim! Tá rapidíssimo</Bubble>
        <Bubble side="left" pill>Ana está digitando…</Bubble>
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-background/40">
        <div className="flex-1 h-9 rounded-full bg-muted/60 px-3 grid items-center text-[12px] text-muted-foreground">
          Mensagem
        </div>
        <button className="h-9 w-9 rounded-full bg-muted text-muted-foreground grid place-items-center">
          <Mic className="h-4 w-4" />
        </button>
        <button className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FeatureTile({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4">
      <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary grid place-items-center">{icon}</div>
      <div className="mt-3 text-[13px] font-bold">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-base font-black tracking-tight bg-gradient-brand bg-clip-text text-transparent">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

/* ===================== DESKTOP ===================== */
function DesktopLanding() {
  return (
    <div className="hidden md:block min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* ambient */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 -left-40 h-[42rem] w-[42rem] rounded-full bg-primary/25 blur-[140px]" />
        <div className="absolute top-1/2 -right-56 h-[36rem] w-[36rem] rounded-full bg-primary/15 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at center, black 35%, transparent 75%)",
          }}
        />
      </div>

      {/* top nav */}
      <header className="relative z-20 px-10 lg:px-16 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-brand grid place-items-center shadow-soft">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <span className="text-[14px] font-bold tracking-[0.22em]">JTC · INTERLINK</span>
        </div>
        <nav className="hidden lg:flex items-center gap-10 text-[13px] font-medium text-muted-foreground">
          <a href="#manifesto" className="hover:text-foreground transition">Manifesto</a>
          <a href="#recursos" className="hover:text-foreground transition">Recursos</a>
          <a href="#numeros" className="hover:text-foreground transition">Números</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="rounded-full px-5 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition">
            Entrar
          </Link>
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="group rounded-full bg-primary text-primary-foreground px-5 py-2 text-[13px] font-bold shadow-soft inline-flex items-center gap-1.5 hover:opacity-95 transition"
          >
            Criar conta <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </header>

      {/* HERO — editorial split */}
      <section className="relative z-10 px-10 lg:px-16 pt-16 pb-10 grid grid-cols-12 gap-10 items-center">
        {/* left */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-primary font-bold">
            <span className="h-px w-10 bg-primary" />
            edição 2026
          </div>

          <h1 className="mt-7 font-display font-black tracking-[-0.045em] text-[5rem] xl:text-[7rem] leading-[0.88]">
            Fale o que
            <br />
            <span className="italic font-serif text-primary">importa.</span>
            <br />
            Em tempo <span className="italic font-serif text-primary">real.</span>
          </h1>

          <p className="mt-8 text-lg text-muted-foreground max-w-xl leading-relaxed">
            Peacely é a rede onde sua comunidade conversa de verdade —
            mensagens, áudio, vídeo, status e grupos, num só lugar, com privacidade
            de ponta a ponta.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className="group inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-7 py-4 text-[14px] font-bold shadow-[0_20px_50px_-15px_color-mix(in_oklab,var(--primary)_55%,transparent)] hover:opacity-95 transition"
            >
              Começar agora
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-7 py-4 text-[14px] font-bold hover:bg-card transition"
            >
              Já tenho conta
            </Link>
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Sem anúncios. Sem rastreio.
            </div>
          </div>
        </div>

        {/* right — stacked cards collage */}
        <div className="col-span-12 lg:col-span-5">
          <div className="relative h-[520px]">
            <div aria-hidden className="absolute -inset-8 rounded-[2.5rem] bg-gradient-brand opacity-20 blur-3xl" />
            <div className="absolute top-0 right-0 w-[80%] rotate-[3deg]">
              <PhoneCard />
            </div>
            <div className="absolute bottom-0 left-0 w-[62%] -rotate-[6deg]">
              <StatusCard />
            </div>
            <div className="absolute top-[42%] right-[-4%] w-[48%] rotate-[-4deg]">
              <CallCard />
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE strip */}
      <div className="relative z-10 border-y border-border/60 bg-card/40 backdrop-blur py-5 overflow-hidden">
        <div className="flex gap-12 animate-[marquee_38s_linear_infinite] whitespace-nowrap text-[13px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-12 items-center">
              <span>Mensagens · em tempo real</span>
              <span className="text-primary">●</span>
              <span>Áudio · cristalino</span>
              <span className="text-primary">●</span>
              <span>Vídeo · em HD</span>
              <span className="text-primary">●</span>
              <span>Status · 24h</span>
              <span className="text-primary">●</span>
              <span>Grupos · ilimitados</span>
              <span className="text-primary">●</span>
              <span>Privacidade · de ponta a ponta</span>
              <span className="text-primary">●</span>
            </div>
          ))}
        </div>
      </div>

      {/* MANIFESTO */}
      <section id="manifesto" className="relative z-10 px-10 lg:px-16 py-28 grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-4">
          <div className="text-[11px] uppercase tracking-[0.32em] text-primary font-bold">manifesto</div>
          <h2 className="mt-4 font-display text-4xl xl:text-5xl font-black tracking-tight leading-[1.02]">
            Conversas merecem<br/>
            <span className="italic font-serif text-primary">cuidado.</span>
          </h2>
        </div>
        <div className="col-span-12 lg:col-span-8 grid sm:grid-cols-2 gap-px bg-border rounded-3xl overflow-hidden border border-border">
          {[
            { t: "Sem ruído", d: "Nada de algoritmo virando sua linha do tempo de cabeça pra baixo. Você decide o que importa." },
            { t: "Sem anúncios", d: "Você não é o produto. Sua atenção fica com quem você ama." },
            { t: "Privacidade real", d: "Criptografia forte e dados sob seu controle. Sempre." },
            { t: "Multi-dispositivo", d: "Mesma conversa no celular, tablet e desktop, sincronizada." },
          ].map((x) => (
            <div key={x.t} className="bg-card/70 backdrop-blur p-7">
              <div className="text-[13px] font-bold tracking-wider uppercase text-primary">{x.t}</div>
              <p className="mt-3 text-[15px] text-foreground/80 leading-relaxed">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RECURSOS — bento */}
      <section id="recursos" className="relative z-10 px-10 lg:px-16 pb-28">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-primary font-bold">recursos</div>
            <h2 className="mt-3 font-display text-4xl xl:text-5xl font-black tracking-tight">
              Tudo pensado pra<br/>
              <span className="italic font-serif text-primary">como você conversa hoje.</span>
            </h2>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-12 gap-4 auto-rows-[180px]">
          <BentoCard className="col-span-12 md:col-span-7 row-span-2" tone="brand"
            icon={<MessageCircle className="h-5 w-5" />} title="Conversas em tempo real"
            desc="Mensagens instantâneas com reações, respostas e mídia. Sincronizado em todos os seus dispositivos." />
          <BentoCard className="col-span-6 md:col-span-5"
            icon={<Video className="h-5 w-5" />} title="Chamadas em HD"
            desc="Áudio e vídeo direto do navegador, sem instalar nada." />
          <BentoCard className="col-span-6 md:col-span-5"
            icon={<Camera className="h-5 w-5" />} title="Status 24h"
            desc="Compartilhe momentos que somem em um dia." />
          <BentoCard className="col-span-12 md:col-span-4"
            icon={<Users className="h-5 w-5" />} title="Grupos vivos"
            desc="Comunidades fáceis de criar e gerenciar." />
          <BentoCard className="col-span-12 md:col-span-4" tone="brand"
            icon={<ShieldCheck className="h-5 w-5" />} title="Privacidade primeiro"
            desc="Você no controle de tudo." />
          <BentoCard className="col-span-12 md:col-span-4"
            icon={<Globe2 className="h-5 w-5" />} title="Multi-device"
            desc="Web, mobile e desktop em sincronia." />
        </div>
      </section>

      {/* NÚMEROS + CTA */}
      <section id="numeros" className="relative z-10 px-10 lg:px-16 pb-24">
        <div className="rounded-[2rem] overflow-hidden border border-border bg-gradient-brand text-primary-foreground p-12 lg:p-16 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center shadow-[0_40px_120px_-40px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] opacity-80 font-bold">comece hoje</div>
            <h3 className="mt-4 font-display text-4xl xl:text-6xl font-black leading-[0.95] tracking-tight">
              Sua próxima conversa
              <br />
              começa <span className="italic font-serif">agora.</span>
            </h3>
            <p className="mt-5 max-w-md opacity-90 text-[15px]">
              Crie sua conta grátis e leve sua comunidade pro Peacely em minutos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                search={{ mode: "signup" }}
                className="group inline-flex items-center gap-2 rounded-full bg-background text-foreground px-7 py-4 text-[14px] font-bold hover:opacity-95 transition"
              >
                Criar minha conta
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-7 py-4 text-[14px] font-bold hover:bg-white/25 transition"
              >
                Já tenho conta
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 lg:gap-3">
            <BigStat value="<50ms" label="latência" />
            <BigStat value="100%" label="privado" />
            <BigStat value="24/7" label="online" />
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-10 lg:px-16 py-8 border-t border-border text-[12px] text-muted-foreground flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-brand grid place-items-center">
            <MessageCircle className="h-3 w-3 text-white" />
          </div>
          <span className="font-bold tracking-[0.22em]">JTC · INTERLINK</span>
        </div>
        <span>© {new Date().getFullYear()} · Feito para você se conectar.</span>
      </footer>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}

function BentoCard({
  className = "",
  icon,
  title,
  desc,
  tone = "default",
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone?: "default" | "brand";
}) {
  const brand = tone === "brand";
  return (
    <div
      className={`group relative rounded-3xl border p-7 flex flex-col justify-between transition-all hover:-translate-y-0.5 ${
        brand
          ? "border-primary/30 bg-gradient-brand text-primary-foreground shadow-[0_20px_60px_-25px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
          : "border-border bg-card/70 backdrop-blur shadow-card hover:shadow-md"
      } ${className}`}
    >
      <div className={`h-11 w-11 rounded-2xl grid place-items-center ${brand ? "bg-white/20 text-white" : "bg-primary/15 text-primary"}`}>
        {icon}
      </div>
      <div>
        <div className="font-display text-xl font-black tracking-tight">{title}</div>
        <div className={`mt-2 text-[13px] leading-relaxed ${brand ? "opacity-90" : "text-muted-foreground"}`}>
          {desc}
        </div>
      </div>
    </div>
  );
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl xl:text-4xl font-black tracking-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] opacity-80 mt-1.5">{label}</div>
    </div>
  );
}

function StatusCard() {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card/85 backdrop-blur-xl overflow-hidden shadow-card">
      <div className="p-3 flex items-center gap-2 border-b border-border">
        <div className="h-7 w-7 rounded-full bg-gradient-brand grid place-items-center text-white text-[11px] font-black">L</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold truncate">Lucas postou um status</div>
          <div className="text-[10px] text-muted-foreground">há 2 min</div>
        </div>
      </div>
      <div className="aspect-[4/3] bg-gradient-hero relative grid place-items-center">
        <Camera className="h-7 w-7 text-primary/70" />
        <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-background/70 backdrop-blur rounded-full px-2 py-0.5">Reels · 0:12</span>
      </div>
    </div>
  );
}

function CallCard() {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card/85 backdrop-blur-xl overflow-hidden shadow-card">
      <div className="p-4 flex flex-col items-center text-center gap-2">
        <div className="relative">
          <div className="h-14 w-14 rounded-full bg-gradient-brand grid place-items-center text-white font-black">M</div>
          <span className="absolute inset-0 rounded-full ring-2 ring-primary/50 animate-ping" />
        </div>
        <div className="text-[12px] font-bold mt-1">Maya está chamando…</div>
        <div className="text-[10px] text-muted-foreground">Chamada de vídeo HD</div>
        <div className="mt-2 flex gap-2">
          <div className="h-9 w-9 rounded-full bg-destructive/15 text-destructive grid place-items-center">
            <Phone className="h-4 w-4 rotate-[135deg]" />
          </div>
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft">
            <Video className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  children,
  side,
  pill = false,
}: {
  children: React.ReactNode;
  side: "left" | "right";
  pill?: boolean;
}) {
  if (pill) {
    return (
      <div className="flex">
        <div className="text-[10px] text-muted-foreground bg-card/80 border border-border rounded-full px-2.5 py-1 inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {children}
        </div>
      </div>
    );
  }
  const isRight = side === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] text-[12px] leading-snug rounded-2xl px-3 py-2 ${
          isRight
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
