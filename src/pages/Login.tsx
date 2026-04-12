import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Eye, EyeOff, Fingerprint, KeyRound, UserX, Lock, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isPanicPassword, executeNuclearOption } from "@/lib/panicButton";
import {
  isBiometricAvailable,
  registerBiometric,
  authenticateBiometric,
  hasStoredCredential,
} from "@/lib/webauthn";
import {
  setMasterCode,
  verifyMasterCode,
  hasMasterCode,
  setAnonSession,
  hasAnonAccount,
} from "@/lib/masterCode";

type LoginMode = "email" | "anonymous";
type AnonStep = "intro" | "create-code" | "confirm-code" | "biometric" | "login-code" | "login-bio";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInAnonymously } = useAuth();
  const [mode, setMode] = useState<LoginMode>("email");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  // Anonymous entry state
  const [anonStep, setAnonStep] = useState<AnonStep>("intro");
  const [masterCodeInput, setMasterCodeInput] = useState("");
  const [confirmCodeInput, setConfirmCodeInput] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
    setExistingAccount(hasAnonAccount());
  }, []);

  useEffect(() => {
    if (mode === "anonymous") {
      setAnonStep(existingAccount ? "login-code" : "intro");
    }
  }, [mode, existingAccount]);

  // Email login handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isSignUp) {
        const isPanic = await isPanicPassword(password);
        if (isPanic) {
          await executeNuclearOption();
          toast.error("Erro de autenticaÃ§Ã£o");
          setLoading(false);
          return;
        }
      }
      if (isSignUp) {
        await signUp(email, password, displayName || email.split("@")[0]);
        toast.success("Conta criada! Verifique seu email para confirmar.");
      } else {
        await signIn(email, password);
        navigate("/chats");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  // Anonymous registration flow
  const handleCreateCode = () => {
    if (masterCodeInput.length !== 6) {
      toast.error("O cÃ³digo deve ter 6 dÃ­gitos");
      return;
    }
    setAnonStep("confirm-code");
  };

  const handleConfirmCode = () => {
    if (confirmCodeInput !== masterCodeInput) {
      toast.error("Os cÃ³digos nÃ£o coincidem");
      setConfirmCodeInput("");
      return;
    }
    if (bioAvailable) {
      setAnonStep("biometric");
    } else {
      handleFinishAnonRegistration(false);
    }
  };

  const handleFinishAnonRegistration = async (withBiometric: boolean) => {
    setLoading(true);
    try {
      // Create anonymous account
      const user = await signInAnonymously();

      // Store master code
      await setMasterCode(masterCodeInput);
      setAnonSession(user.id);

      // Register biometric if available and chosen
      if (withBiometric) {
        const result = await registerBiometric(user.id);
        if (!result) {
          toast.error("Falha ao registrar biometria, mas a conta foi criada");
        }
      }

      toast.success("Conta anÃ´nima criada com sucesso!");
      navigate("/chats");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  // Anonymous login flow
  const handleAnonLogin = async () => {
    setLoading(true);
    try {
      const valid = await verifyMasterCode(masterCodeInput);
      if (!valid) {
        // Check if it's panic password
        const isPanic = await isPanicPassword(masterCodeInput);
        if (isPanic) {
          await executeNuclearOption();
          toast.error("Erro de autenticaÃ§Ã£o");
          setLoading(false);
          return;
        }
        toast.error("CÃ³digo mestre incorreto");
        setLoading(false);
        return;
      }

      if (bioAvailable && hasStoredCredential()) {
        setAnonStep("login-bio");
        setLoading(false);
      } else {
        // No biometric, sign in directly
        await signInAnonymously();
        navigate("/chats");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const authenticated = await authenticateBiometric();
      if (!authenticated) {
        toast.error("VerificaÃ§Ã£o biomÃ©trica falhou");
        setLoading(false);
        return;
      }
      await signInAnonymously();
      toast.success("Acesso autorizado");
      navigate("/chats");
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticaÃ§Ã£o biomÃ©trica");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 scanline opacity-30" />
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <motion.div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 neon-glow"
          >
            <Shield className="h-10 w-10 text-primary" />
          </motion.div>
          <h1 className="font-mono text-3xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-transparent bg-clip-text animate-gradient px-4 text-center name-glow">
            JTC <span className="text-primary ">Parker</span>
          </h1>
          <small className="mt-1 font-mono text-xs text-muted-foreground uppercase text-shadow-sm-primary">
            ComunicaÃ§Ã£o Segura
          </small>
        </div>

        {/* Mode Selector */}
        <div className="mb-6 flex rounded-xl border border-border bg-surface-1 p-1">
          <button
            onClick={() => setMode("email")}
            className={`flex-1 rounded-lg py-2.5 font-mono text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === "email"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </button>
          <button
            onClick={() => setMode("anonymous")}
            className={`flex-1 rounded-lg py-2.5 font-mono text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === "anonymous"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5" />
            AnÃ´nimo
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === "email" ? (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Nome</label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Seu nome"
                      className="border-border bg-surface-1 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="border-border bg-surface-1 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Senha</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="â¢â¢â¢â¢â¢â¢â¢â¢â¢â¢"
                      required
                      minLength={6}
                      className="border-border bg-surface-1 pr-10 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary font-mono text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 neon-glow transition-shadow"
                >
                  {loading ? "Aguarde..." : isSignUp ? "Criar Conta" : "Acessar Sistema"}
                </Button>
              </form>
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="mt-4 w-full text-center font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp ? "JÃ¡ tem conta? Entrar" : "NÃ£o tem conta? Criar uma"}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="anonymous"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <AnimatePresence mode="wait">
                {/* INTRO â New account */}
                {anonStep === "intro" && (
                  <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <UserX className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold text-foreground">Anonymous Entry</p>
                          <p className="font-mono text-[10px] text-muted-foreground">Anonimato total desde o primeiro segundo</p>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2">
                          <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <p className="font-mono text-[11px] text-muted-foreground leading-tight">
                            Conta vinculada Ã  <span className="text-foreground">Secure Enclave</span> do seu dispositivo. SÃ³ o dono fÃ­sico do aparelho pode acessar.
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <p className="font-mono text-[11px] text-muted-foreground leading-tight">
                            <span className="text-foreground">Imune a SIM Swap.</span> Sem telefone, sem email â impossÃ­vel clonar seu acesso.
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <p className="font-mono text-[11px] text-muted-foreground leading-tight">
                            Protegido por <span className="text-foreground">CÃ³digo Mestre de 6 dÃ­gitos</span> + biometria do hardware.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => setAnonStep("create-code")}
                      className="w-full bg-primary font-mono text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 neon-glow"
                    >
                      <Fingerprint className="mr-2 h-4 w-4" />
                      Criar Acesso AnÃ´nimo
                    </Button>
                  </motion.div>
                )}

                {/* CREATE CODE */}
                {anonStep === "create-code" && (
                  <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                        <KeyRound className="h-7 w-7 text-primary" />
                      </div>
                      <p className="font-mono text-sm font-bold text-foreground">CÃ³digo Mestre</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">Crie um cÃ³digo de 6 dÃ­gitos para proteger sua conta</p>
                    </div>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={masterCodeInput} onChange={setMasterCodeInput}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={1} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={2} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={3} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={4} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={5} className="border-border bg-surface-1 text-foreground" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button
                      onClick={handleCreateCode}
                      disabled={masterCodeInput.length !== 6}
                      className="w-full bg-primary font-mono text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      Continuar
                    </Button>
                  </motion.div>
                )}

                {/* CONFIRM CODE */}
                {anonStep === "confirm-code" && (
                  <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="text-center">
                      <p className="font-mono text-sm font-bold text-foreground">Confirmar CÃ³digo</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">Digite novamente para confirmar</p>
                    </div>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={confirmCodeInput} onChange={setConfirmCodeInput}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={1} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={2} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={3} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={4} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={5} className="border-border bg-surface-1 text-foreground" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button
                      onClick={handleConfirmCode}
                      disabled={confirmCodeInput.length !== 6}
                      className="w-full bg-primary font-mono text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      Confirmar
                    </Button>
                  </motion.div>
                )}

                {/* BIOMETRIC REGISTRATION */}
                {anonStep === "biometric" && (
                  <motion.div key="bio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/10"
                      >
                        <Fingerprint className="h-10 w-10 text-primary" />
                      </motion.div>
                      <p className="font-mono text-sm font-bold text-foreground">Vincular Biometria</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground leading-relaxed">
                        Vincule sua digital ou Face ID Ã  Secure Enclave do dispositivo para acesso instantÃ¢neo.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleFinishAnonRegistration(true)}
                      disabled={loading}
                      className="w-full bg-primary font-mono text-sm text-primary-foreground hover:bg-primary/90 neon-glow"
                    >
                      <Fingerprint className="mr-2 h-4 w-4" />
                      {loading ? "Registrando..." : "Registrar Biometria"}
                    </Button>
                    <button
                      onClick={() => handleFinishAnonRegistration(false)}
                      className="w-full text-center font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Pular â usar apenas CÃ³digo Mestre
                    </button>
                  </motion.div>
                )}

                {/* LOGIN â Enter master code */}
                {anonStep === "login-code" && (
                  <motion.div key="login-code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                        <Lock className="h-7 w-7 text-primary" />
                      </div>
                      <p className="font-mono text-sm font-bold text-foreground">CÃ³digo Mestre</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">Digite seu cÃ³digo de 6 dÃ­gitos</p>
                    </div>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={masterCodeInput} onChange={setMasterCodeInput}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={1} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={2} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={3} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={4} className="border-border bg-surface-1 text-foreground" />
                          <InputOTPSlot index={5} className="border-border bg-surface-1 text-foreground" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button
                      onClick={handleAnonLogin}
                      disabled={masterCodeInput.length !== 6 || loading}
                      className="w-full bg-primary font-mono text-sm text-primary-foreground hover:bg-primary/90 neon-glow"
                    >
                      {loading ? "Verificando..." : "Desbloquear"}
                    </Button>
                    <p className="text-center font-mono text-[10px] text-muted-foreground/50">
                      Protegido pela Secure Enclave do dispositivo
                    </p>
                  </motion.div>
                )}

                {/* LOGIN â Biometric verification */}
                {anonStep === "login-bio" && (
                  <motion.div key="login-bio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/10 neon-glow"
                      >
                        <Fingerprint className="h-10 w-10 text-primary" />
                      </motion.div>
                      <p className="font-mono text-sm font-bold text-foreground">VerificaÃ§Ã£o BiomÃ©trica</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">Use sua digital ou Face ID para continuar</p>
                    </div>
                    <Button
                      onClick={handleBiometricLogin}
                      disabled={loading}
                      className="w-full bg-primary font-mono text-sm text-primary-foreground hover:bg-primary/90 neon-glow"
                    >
                      <Fingerprint className="mr-2 h-4 w-4" />
                      {loading ? "Verificando..." : "Autenticar"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center font-mono text-[10px] text-muted-foreground/50 text-shadow-xs-primary">
          CRIPTOGRAFIA PONTA A PONTA ÃÂ· AES-256 ÃÂ· ZERO CUSTODY
        </p>
      </motion.div>
    </div>
  );
};

export default Login;