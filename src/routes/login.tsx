import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdminAccess } from "@/lib/admin.functions";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  Mail,
  ScanFace,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { z } from "zod";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { evaluatePassword } from "@/lib/password-strength";
import { logSecurityEvent } from "@/lib/security";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import peacelyLogo from "@/assets/peacely-logo.png.asset.json";

const search = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/login")({
  validateSearch: search,
  component: LoginPage,
});

type Step = "account" | "avatar" | "face" | "people" | "done";

type Suggestion = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  followers_count: number | null;
  is_plus: boolean | null;
};

function LoginPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // multi-step signup
  const [step, setStep] = useState<Step>("account");
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  // step: avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // step: face
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facePhoto, setFacePhoto] = useState<Blob | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // step: people
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedFollows, setSelectedFollows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/public/admin-bootstrap", { cache: "no-store" }).catch(() => {});
  }, []);

  // Camera lifecycle
  useEffect(() => {
    if (step !== "face") {
      stopCamera();
      return;
    }
    if (facePhoto) return;
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, facePhoto]);

  // Load suggestions when reaching people step
  useEffect(() => {
    if (step !== "people" || suggestions.length) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, followers_count, is_plus")
        .neq("id", createdUserId ?? "")
        .order("followers_count", { ascending: false })
        .limit(12);
      setSuggestions((data ?? []) as Suggestion[]);
    })();
  }, [step, createdUserId, suggestions.length]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch {
      toast.error("Não foi possível acessar a câmera.");
      setCameraReady(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function captureFace() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.9),
    );
    if (!blob) return;
    setFacePhoto(blob);
    setFacePreview(URL.createObjectURL(blob));
    stopCamera();
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("ban") || msg.includes("banned")) {
          throw new Error("Esta conta foi banida permanentemente. Contate o suporte.");
        }
        logSecurityEvent({
          type: "login_failed",
          severity: "medium",
          riskScore: 25,
          message: "Falha de autenticação",
          metadata: { email_hint: email.slice(0, 2) + "***" },
        });
        throw new Error("E-mail ou senha incorretos.");
      }
      let isAdmin = false;
      try {
        const r = await ensureAdminAccess({});
        isAdmin = !!r?.is_admin;
      } catch {}
      navigate({ to: isAdmin ? "/admin" : "/chats" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function submitSignupStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!ageOk) {
      toast.error("Você precisa ter 10 anos ou mais para criar uma conta.");
      return;
    }
    const strength = evaluatePassword(password);
    if (strength.score < 2) {
      toast.error("Sua senha está muito fraca. Tente uma combinação mais forte.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: name, age_confirmed_10_plus: true },
        },
      });
      if (error) throw error;
      // Try to sign in immediately so we can do uploads / follows
      const { data: signInData, error: signInErr } =
        await supabase.auth.signInWithPassword({ email, password });
      const uid = signInData?.user?.id ?? data?.user?.id ?? null;
      if (signInErr && !uid) {
        toast.success("Conta criada! Confirme seu e-mail e entre.");
        setIsSignup(false);
        return;
      }
      setCreatedUserId(uid);
      setStep("avatar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function uploadAvatar() {
    if (!avatarFile || !createdUserId) return;
    const ext = avatarFile.name.split(".").pop() || "jpg";
    const path = `${createdUserId}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", createdUserId);
  }

  async function uploadFace() {
    if (!facePhoto || !createdUserId) return;
    const path = `verifications/${createdUserId}.jpg`;
    await supabase.storage
      .from("avatars")
      .upload(path, facePhoto, { upsert: true, contentType: "image/jpeg" });
  }

  async function followSelected() {
    if (!createdUserId || selectedFollows.size === 0) return;
    const rows = Array.from(selectedFollows).map((id) => ({
      follower_id: createdUserId,
      following_id: id,
    }));
    await supabase.from("follows").insert(rows);
  }

  async function finishOnboarding() {
    setLoading(true);
    try {
      await Promise.allSettled([uploadAvatar(), uploadFace(), followSelected()]);
      toast.success("Bem-vindo ao Peacely! ✌️");
      navigate({ to: "/chats" });
    } catch {
      navigate({ to: "/chats" });
    } finally {
      setLoading(false);
    }
  }

  function toggleFollow(id: string) {
    setSelectedFollows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---------------- RENDER ---------------- */

  const inOnboarding = isSignup && step !== "account";

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="md:hidden">
        <ShellMobile>
          {!isSignup ? (
            <LoginForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              showPwd={showPwd}
              setShowPwd={setShowPwd}
              loading={loading}
              onSubmit={submitLogin}
              switchToSignup={() => setIsSignup(true)}
            />
          ) : step === "account" ? (
            <SignupAccountForm
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              ageOk={ageOk}
              setAgeOk={setAgeOk}
              showPwd={showPwd}
              setShowPwd={setShowPwd}
              loading={loading}
              onSubmit={submitSignupStep1}
              switchToLogin={() => setIsSignup(false)}
            />
          ) : (
            <OnboardingSteps
              step={step}
              setStep={setStep}
              avatarPreview={avatarPreview}
              onPickAvatar={onPickAvatar}
              videoRef={videoRef}
              cameraReady={cameraReady}
              facePreview={facePreview}
              captureFace={captureFace}
              retakeFace={() => {
                setFacePhoto(null);
                setFacePreview(null);
              }}
              suggestions={suggestions}
              selectedFollows={selectedFollows}
              toggleFollow={toggleFollow}
              finish={finishOnboarding}
              loading={loading}
            />
          )}
        </ShellMobile>
      </div>

      {/* DESKTOP */}
      <div className="hidden md:grid min-h-screen w-full grid-cols-[1.05fr_1fr]">
        <BrandPanel />
        <main className="relative flex items-center justify-center p-10 lg:p-16">
          <Link
            to="/"
            className="absolute top-8 left-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao início
          </Link>
          <div className="w-full max-w-md">
            {!inOnboarding && (
              <div className="inline-flex p-1 rounded-full bg-muted/60 border border-border mb-8">
                <button
                  onClick={() => {
                    setIsSignup(false);
                    setStep("account");
                  }}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    !isSignup
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Entrar
                </button>
                <button
                  onClick={() => setIsSignup(true)}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isSignup
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Criar conta
                </button>
              </div>
            )}

            {!isSignup ? (
              <LoginForm
                desktop
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPwd={showPwd}
                setShowPwd={setShowPwd}
                loading={loading}
                onSubmit={submitLogin}
                switchToSignup={() => setIsSignup(true)}
              />
            ) : step === "account" ? (
              <SignupAccountForm
                desktop
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                ageOk={ageOk}
                setAgeOk={setAgeOk}
                showPwd={showPwd}
                setShowPwd={setShowPwd}
                loading={loading}
                onSubmit={submitSignupStep1}
                switchToLogin={() => setIsSignup(false)}
              />
            ) : (
              <OnboardingSteps
                step={step}
                setStep={setStep}
                avatarPreview={avatarPreview}
                onPickAvatar={onPickAvatar}
                videoRef={videoRef}
                cameraReady={cameraReady}
                facePreview={facePreview}
                captureFace={captureFace}
                retakeFace={() => {
                  setFacePhoto(null);
                  setFacePreview(null);
                }}
                suggestions={suggestions}
                selectedFollows={selectedFollows}
                toggleFollow={toggleFollow}
                finish={finishOnboarding}
                loading={loading}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* =================== SUB-COMPONENTS =================== */

function ShellMobile({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <div className="app-content px-6 pt-10 bg-gradient-hero min-h-screen">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground mb-8">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Link>
        <div className="h-16 w-16 grid place-items-center">
          <PeaceMark className="h-16 w-16" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Peacely</h1>
        <p className="text-sm text-muted-foreground">Conexões com paz e amor ✌️</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function PeaceMark({ className = "h-9 w-9" }: { className?: string }) {
  return <img src={peacelyLogo.url} alt="Peacely" className={`${className} object-contain drop-shadow`} />;
}

function BrandPanel() {
  return (
    <aside className="relative overflow-hidden bg-gradient-brand text-white p-12 lg:p-16 flex flex-col justify-between">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-white/15 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-black/25 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="relative z-10 flex items-center gap-3">
        <PeaceMark className="h-12 w-12" />
        <span className="text-lg font-semibold tracking-wide">Peacely</span>
      </div>
      <div className="relative z-10 max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1.5 text-xs font-medium ring-1 ring-white/15">
          <Sparkles className="h-3.5 w-3.5" /> Comunidade segura · ambiente saudável
        </span>
        <h2 className="mt-6 text-4xl lg:text-5xl font-bold leading-[1.05] tracking-tight">
          Paz, amor e
          <br />
          conexões que importam.
        </h2>
        <p className="mt-5 text-white/80 text-base lg:text-lg max-w-md">
          Mensagens, status, reels e chamadas — com verificação de identidade e proteção para
          quem é mais novo.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 max-w-md">
          <Highlight icon={<ShieldCheck className="h-4 w-4" />} text="Acesso a partir de 10 anos com filtros" />
          <Highlight icon={<ScanFace className="h-4 w-4" />} text="Verificação facial leve no cadastro" />
          <Highlight icon={<Users className="h-4 w-4" />} text="Encontre amigos próximos na hora" />
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between text-sm text-white/70">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Milhares de pessoas online agora
        </span>
        <span>© {new Date().getFullYear()} Peacely</span>
      </div>
    </aside>
  );
}

function Highlight({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur px-4 py-2.5 ring-1 ring-white/15">
      <div className="h-7 w-7 rounded-lg bg-white/15 grid place-items-center">{icon}</div>
      <span className="text-sm text-white/90">{text}</span>
    </div>
  );
}

/* ---------- Login form ---------- */
function LoginForm(props: {
  desktop?: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPwd: boolean;
  setShowPwd: (v: (p: boolean) => boolean) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  switchToSignup: () => void;
}) {
  const { desktop, email, setEmail, password, setPassword, showPwd, setShowPwd, loading, onSubmit, switchToSignup } = props;
  return (
    <>
      {desktop && (
        <>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Bem-vindo de volta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Entre para continuar no Peacely.</p>
        </>
      )}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <IconField icon={<Mail className="h-4 w-4" />} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@exemplo.com" required />
        <IconField
          icon={<Lock className="h-4 w-4" />}
          label="Senha"
          type={showPwd ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="Mínimo 6 caracteres"
          required
          minLength={6}
          trailing={
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <button disabled={loading} className="group w-full rounded-full bg-primary text-primary-foreground py-3.5 font-semibold disabled:opacity-60 shadow-soft hover:opacity-95 transition-all inline-flex items-center justify-center gap-2">
          {loading ? "Aguarde..." : "Entrar"}
          {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>
      <button onClick={switchToSignup} className="mt-6 w-full text-sm text-muted-foreground">
        Criar nova conta
      </button>
    </>
  );
}

/* ---------- Signup step 1 ---------- */
function SignupAccountForm(props: {
  desktop?: boolean;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  ageOk: boolean;
  setAgeOk: (v: boolean) => void;
  showPwd: boolean;
  setShowPwd: (v: (p: boolean) => boolean) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  switchToLogin: () => void;
}) {
  const { desktop, name, setName, email, setEmail, password, setPassword, ageOk, setAgeOk, showPwd, setShowPwd, loading, onSubmit, switchToLogin } = props;
  return (
    <>
      {desktop && (
        <>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Crie sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Comunidade segura, com paz e amor.</p>
        </>
      )}
      <StepDots current={0} total={4} />
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <IconField icon={<User className="h-4 w-4" />} label="Nome" type="text" value={name} onChange={setName} placeholder="Como devemos te chamar?" required />
        <IconField icon={<Mail className="h-4 w-4" />} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@exemplo.com" required />
        <IconField
          icon={<Lock className="h-4 w-4" />}
          label="Senha"
          type={showPwd ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="Mínimo 6 caracteres"
          required
          minLength={6}
          trailing={
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <PasswordStrengthMeter password={password} />

        <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ageOk}
            onChange={(e) => setAgeOk(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
          />
          <span className="text-xs text-muted-foreground leading-snug">
            Eu tenho <b className="text-foreground">10 anos ou mais</b> e concordo com as regras de
            boa convivência do Peacely. Contas de menores de 10 anos não são permitidas.
          </span>
        </label>

        <button
          disabled={loading}
          className="group w-full rounded-full bg-primary text-primary-foreground py-3.5 font-semibold disabled:opacity-60 shadow-soft hover:opacity-95 transition-all inline-flex items-center justify-center gap-2"
        >
          {loading ? "Criando..." : "Continuar"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
      <button onClick={switchToLogin} className="mt-6 w-full text-sm text-muted-foreground">
        Já tenho conta
      </button>
    </>
  );
}

/* ---------- Onboarding (steps 2-4) ---------- */
function OnboardingSteps(props: {
  step: Step;
  setStep: (s: Step) => void;
  avatarPreview: string | null;
  onPickAvatar: (e: React.ChangeEvent<HTMLInputElement>) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  facePreview: string | null;
  captureFace: () => void;
  retakeFace: () => void;
  suggestions: Suggestion[];
  selectedFollows: Set<string>;
  toggleFollow: (id: string) => void;
  finish: () => void;
  loading: boolean;
}) {
  const { step, setStep, avatarPreview, onPickAvatar, videoRef, cameraReady, facePreview, captureFace, retakeFace, suggestions, selectedFollows, toggleFollow, finish, loading } = props;

  const stepIndex = step === "avatar" ? 1 : step === "face" ? 2 : 3;

  return (
    <div>
      <StepDots current={stepIndex} total={4} />

      {step === "avatar" && (
        <section className="mt-6">
          <h2 className="text-2xl font-bold">Foto de perfil</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Mostra quem você é. Você pode trocar depois.
          </p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <label className="relative h-36 w-36 rounded-full bg-muted border border-border overflow-hidden grid place-items-center cursor-pointer hover:opacity-90">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Prévia" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
              )}
              <input type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
            </label>
            <span className="text-xs text-muted-foreground">Toque para escolher uma imagem</span>
          </div>
          <StepNav onSkip={() => setStep("face")} onNext={() => setStep("face")} nextLabel="Continuar" />
        </section>
      )}

      {step === "face" && (
        <section className="mt-6">
          <h2 className="text-2xl font-bold">Verificação facial</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Mantém o Peacely seguro. Tire uma foto rápida do seu rosto.
          </p>

          <div className="mt-6 mx-auto aspect-square w-full max-w-xs rounded-3xl overflow-hidden bg-black grid place-items-center relative">
            {facePreview ? (
              <img src={facePreview} alt="Sua verificação" className="h-full w-full object-cover" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover scale-x-[-1]"
                  muted
                  playsInline
                />
                {!cameraReady && (
                  <div className="absolute inset-0 grid place-items-center text-white/70 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="h-8 w-8" />
                      Aguardando câmera…
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-5 flex justify-center">
            {facePreview ? (
              <button
                onClick={retakeFace}
                className="rounded-full bg-muted text-foreground px-6 py-3 text-sm font-semibold"
              >
                Tirar outra
              </button>
            ) : (
              <button
                onClick={captureFace}
                disabled={!cameraReady}
                className="rounded-full bg-primary text-primary-foreground px-8 py-3 text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Camera className="h-4 w-4" /> Continuar
              </button>
            )}
          </div>

          <StepNav onSkip={() => setStep("people")} onNext={() => setStep("people")} nextLabel="Avançar" />
        </section>
      )}

      {step === "people" && (
        <section className="mt-6">
          <h2 className="text-2xl font-bold">Pessoas para seguir</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sugestões da comunidade. Escolha quem você quer acompanhar.
          </p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {suggestions.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground text-center py-8">
                Nenhuma sugestão por enquanto.
              </div>
            )}
            {suggestions.map((s) => {
              const selected = selectedFollows.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleFollow(s.id)}
                  className={`relative rounded-2xl border p-3 text-left transition-all ${
                    selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="h-14 w-14 rounded-full bg-muted overflow-hidden mb-2 grid place-items-center">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className={`text-xs font-semibold truncate ${s.is_plus ? "plus-name" : ""}`}>
                      {s.full_name ?? s.username ?? "Usuário"}
                    </span>
                    {s.is_plus && <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />}
                  </div>
                  {s.username && (
                    <div className="text-[11px] text-muted-foreground truncate">@{s.username}</div>
                  )}
                  <span
                    className={`absolute top-2 right-2 h-6 w-6 rounded-full grid place-items-center text-[10px] font-bold ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            disabled={loading}
            onClick={finish}
            className="mt-6 w-full rounded-full bg-primary text-primary-foreground py-3.5 font-semibold disabled:opacity-60 shadow-soft inline-flex items-center justify-center gap-2"
          >
            {loading ? "Finalizando..." : selectedFollows.size > 0 ? `Seguir ${selectedFollows.size} e entrar` : "Entrar no Peacely"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}
    </div>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i <= current ? "w-8 bg-primary" : "w-4 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

function StepNav({
  onSkip,
  onNext,
  nextLabel,
}: {
  onSkip: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button onClick={onSkip} className="text-sm text-muted-foreground">
        Pular
      </button>
      <button
        onClick={onNext}
        className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
      >
        {nextLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function IconField({
  icon,
  label,
  value,
  onChange,
  type,
  required,
  minLength,
  placeholder,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 relative flex items-center rounded-2xl bg-input/60 border border-border focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
        <span className="pl-4 text-muted-foreground">{icon}</span>
        <input
          type={type}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent px-3 py-3.5 outline-none text-sm"
        />
        {trailing && <span className="pr-4">{trailing}</span>}
      </div>
    </label>
  );
}
