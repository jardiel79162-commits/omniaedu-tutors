import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Monitor, ShieldCheck, ArrowLeft, Apple, Smartphone } from "lucide-react";

const WINDOWS_URL = "/api/public/download/windows";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Baixar Peacely — App para Windows" },
      {
        name: "description",
        content:
          "Baixe o app oficial do Peacely para Windows. Instalador real (.exe) em ZIP, pronto para usar.",
      },
      { property: "og:title", content: "Baixar Peacely — App para Windows" },
      {
        property: "og:description",
        content: "Versão desktop oficial do Peacely para Windows 10/11.",
      },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#0a0a1a] text-white relative overflow-hidden">
      {/* ambient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />

      <header className="relative z-10 mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" /> Início
        </Link>
        <span className="text-sm font-semibold tracking-wider text-white/80">
          Peacely
        </span>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Build oficial · seguro
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Baixe o Peacely
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
              para o seu computador
            </span>
          </h1>
          <p className="mt-5 text-white/70 text-lg">
            App de desktop nativo. Conversas, chamadas e notificações direto na
            barra de tarefas — sem precisar abrir o navegador.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {/* Windows */}
          <div className="md:col-span-1 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between">
              <div className="h-11 w-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-indigo-300" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-300/90 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full">
                Disponível
              </span>
            </div>
            <h2 className="mt-5 text-xl font-semibold">Windows 10 / 11</h2>
            <p className="mt-1 text-sm text-white/60">
              Arquivo ZIP · ~142 MB · 64-bit
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-white/70">
              <li>• Executável real (.exe) Electron</li>
              <li>• Sem instalação — só extrair e abrir</li>
              <li>• Atualizações automáticas via web</li>
            </ul>
            <a
              href={WINDOWS_URL}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#0a0a1a] font-semibold py-3 hover:bg-white/90 transition"
              download
            >
              <Download className="h-4 w-4" /> Baixar para Windows
            </a>
            <p className="mt-3 text-[11px] text-white/40 text-center">
              v1.0.0 · x64
            </p>
          </div>

          {/* macOS — em breve */}
          <div className="md:col-span-1 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl flex flex-col opacity-70">
            <div className="flex items-center justify-between">
              <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Apple className="h-5 w-5 text-white/70" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/50 bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                Em breve
              </span>
            </div>
            <h2 className="mt-5 text-xl font-semibold">macOS</h2>
            <p className="mt-1 text-sm text-white/60">Apple Silicon e Intel</p>
            <ul className="mt-4 space-y-1.5 text-sm text-white/60">
              <li>• Versão nativa em desenvolvimento</li>
              <li>• Notarizada pela Apple</li>
            </ul>
            <button
              disabled
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 text-white/60 font-semibold py-3 cursor-not-allowed"
            >
              Em breve
            </button>
          </div>

          {/* Android — em breve */}
          <div className="md:col-span-1 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl flex flex-col opacity-70">
            <div className="flex items-center justify-between">
              <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-white/70" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/50 bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                Em breve
              </span>
            </div>
            <h2 className="mt-5 text-xl font-semibold">Android</h2>
            <p className="mt-1 text-sm text-white/60">APK assinado · Play Store</p>
            <ul className="mt-4 space-y-1.5 text-sm text-white/60">
              <li>• Build via Capacitor</li>
              <li>• Notificações nativas</li>
            </ul>
            <button
              disabled
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 text-white/60 font-semibold py-3 cursor-not-allowed"
            >
              Em breve
            </button>
          </div>
        </div>

        {/* Como instalar */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
          <h3 className="text-xl font-semibold">Como instalar no Windows</h3>
          <ol className="mt-5 grid md:grid-cols-3 gap-5 text-sm text-white/75">
            <li className="rounded-xl bg-white/5 border border-white/10 p-4">
              <span className="text-indigo-300 font-semibold">1.</span> Baixe o
              arquivo <code className="text-white">JTC-INTERLINK-windows-x64.zip</code>.
            </li>
            <li className="rounded-xl bg-white/5 border border-white/10 p-4">
              <span className="text-indigo-300 font-semibold">2.</span> Clique
              com o direito → <b>Extrair tudo</b>.
            </li>
            <li className="rounded-xl bg-white/5 border border-white/10 p-4">
              <span className="text-indigo-300 font-semibold">3.</span> Abra a
              pasta e dê duplo clique em{" "}
              <code className="text-white">JTC-INTERLINK.exe</code>.
            </li>
          </ol>
          <p className="mt-5 text-xs text-white/50">
            Na primeira execução o Windows pode mostrar o aviso “SmartScreen”.
            Clique em <b>Mais informações → Executar assim mesmo</b> — o app
            ainda não está assinado digitalmente.
          </p>
        </div>
      </section>
    </main>
  );
}
