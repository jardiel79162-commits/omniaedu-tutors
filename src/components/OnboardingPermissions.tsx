import { useEffect, useState } from "react";
import { Bell, Camera, MapPin, Image as ImageIcon, Mic, ShieldCheck, ChevronRight, Check, Settings as SettingsIcon } from "lucide-react";

const STORAGE_KEY = "jtc.onboarding.permissions.v1";

type StepId = "intro" | "notifications" | "camera" | "microphone" | "photos" | "location" | "done";
type PermStatus = "granted" | "denied" | "unknown";

type Step = {
  id: StepId;
  icon: any;
  title: string;
  description: string;
  cta: string;
  run?: () => Promise<PermStatus>;
};

async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function openAndroidSettings(target: "app" | "notifications" | "location" = "app") {
  try {
    const mod: any = await import("capacitor-native-settings");
    const NativeSettings = mod.NativeSettings ?? mod.default?.NativeSettings ?? mod.default;
    const AndroidSettings = mod.AndroidSettings ?? mod.default?.AndroidSettings;
    const IOSSettings = mod.IOSSettings ?? mod.default?.IOSSettings;
    let optionAndroid = AndroidSettings?.ApplicationDetails;
    if (target === "notifications") optionAndroid = AndroidSettings?.AppNotification ?? optionAndroid;
    if (target === "location") optionAndroid = AndroidSettings?.Location ?? optionAndroid;
    await NativeSettings.open({
      optionAndroid,
      optionIOS: IOSSettings?.App,
    });
  } catch (e) {
    console.warn("openAndroidSettings failed", e);
  }
}

async function askNotifications(): Promise<PermStatus> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const cur = await PushNotifications.checkPermissions();
    let state = cur.receive;
    if (state !== "granted") {
      const res = await PushNotifications.requestPermissions();
      state = res.receive;
    }
    if (state === "granted") {
      try { await PushNotifications.register(); } catch {}
      return "granted";
    }
    if (state === "denied") return "denied";
    return "unknown";
  } catch {
    try {
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "default") {
          const r = await Notification.requestPermission();
          return r === "granted" ? "granted" : r === "denied" ? "denied" : "unknown";
        }
        return Notification.permission === "granted" ? "granted" : "denied";
      }
    } catch {}
    return "unknown";
  }
}

async function askCamera(): Promise<PermStatus> {
  try {
    const { Camera } = await import("@capacitor/camera");
    let cur = await Camera.checkPermissions();
    if (cur.camera !== "granted") {
      cur = await Camera.requestPermissions({ permissions: ["camera"] });
    }
    if (cur.camera === "granted") return "granted";
    if (cur.camera === "denied") return "denied";
    return "unknown";
  } catch {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach((t) => t.stop());
      return "granted";
    } catch {
      return "denied";
    }
  }
}

async function askMicrophone(): Promise<PermStatus> {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

async function askPhotos(): Promise<PermStatus> {
  try {
    const { Camera } = await import("@capacitor/camera");
    let cur = await Camera.checkPermissions();
    if (cur.photos !== "granted") {
      cur = await Camera.requestPermissions({ permissions: ["photos"] });
    }
    if (cur.photos === "granted" || (cur as any).photos === "limited") return "granted";
    if (cur.photos === "denied") return "denied";
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function askLocation(): Promise<PermStatus> {
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    let cur = await Geolocation.checkPermissions();
    if (cur.location !== "granted") {
      cur = await Geolocation.requestPermissions({ permissions: ["location"] });
    }
    if (cur.location === "granted") return "granted";
    if (cur.location === "denied") return "denied";
    return "unknown";
  } catch {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        if (!navigator.geolocation) return resolve(false);
        navigator.geolocation.getCurrentPosition(() => resolve(true), () => resolve(false), { timeout: 5000 });
      });
      return ok ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }
}

const STEPS: Step[] = [
  { id: "intro", icon: ShieldCheck, title: "Bem-vindo ao Peacely", description: "Para você aproveitar tudo — mensagens, chamadas, fotos, vídeos e localização — precisamos liberar algumas permissões. Vamos passo a passo.", cta: "Começar" },
  { id: "notifications", icon: Bell, title: "Notificações", description: "Receba avisos de novas mensagens, chamadas e atualizações mesmo com o app fechado.", cta: "Permitir notificações", run: askNotifications },
  { id: "camera", icon: Camera, title: "Câmera", description: "Necessário para tirar fotos, gravar vídeos e fazer chamadas de vídeo dentro do app.", cta: "Permitir câmera", run: askCamera },
  { id: "microphone", icon: Mic, title: "Microfone", description: "Necessário para mensagens de voz, chamadas de voz e vídeo.", cta: "Permitir microfone", run: askMicrophone },
  { id: "photos", icon: ImageIcon, title: "Fotos e mídia", description: "Permite escolher imagens e vídeos da galeria para enviar nas conversas e postagens.", cta: "Permitir acesso à galeria", run: askPhotos },
  { id: "location", icon: MapPin, title: "Localização", description: "Necessário para compartilhar sua localização em conversas e marcar lugares nas postagens.", cta: "Permitir localização", run: askLocation },
  { id: "done", icon: Check, title: "Tudo pronto!", description: "Você já pode usar todos os recursos do app. Pode alterar essas permissões a qualquer momento nas configurações do Android.", cta: "Entrar no app" },
];

export function OnboardingPermissions() {
  const [show, setShow] = useState(false);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      if (localStorage.getItem(STORAGE_KEY)) return;
      const native = await isNative();
      if (!native) return;
      setShow(true);
    })();
  }, []);

  if (!show) return null;

  const step = STEPS[idx];
  const Icon = step.icon;
  const last = idx === STEPS.length - 1;

  async function next() {
    if (busy) return;
    setBusy(true);
    let status: PermStatus = "granted";
    try {
      if (step.run) status = await step.run();
    } finally {
      setBusy(false);
    }
    if (status === "denied") {
      setDenied(true);
      return;
    }
    advance();
  }

  function advance() {
    setDenied(false);
    if (last) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setShow(false);
    } else {
      setIdx((i) => i + 1);
    }
  }

  function skip() {
    if (last) return;
    setDenied(false);
    setIdx((i) => i + 1);
  }

  async function openSettings() {
    const target =
      step.id === "notifications" ? "notifications" :
      step.id === "location" ? "location" : "app";
    await openAndroidSettings(target);
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      <div className="flex items-center gap-1.5 px-6 pt-6">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`h-1 flex-1 rounded-full transition ${i <= idx ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className={`h-24 w-24 rounded-3xl grid place-items-center mb-8 ${denied ? "bg-destructive/10" : "bg-primary/10"}`}>
          <Icon className={`h-12 w-12 ${denied ? "text-destructive" : "text-primary"}`} />
        </div>
        <h1 className="text-2xl font-bold mb-3">
          {denied ? "Permissão negada" : step.title}
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed max-w-sm">
          {denied
            ? `Para liberar ${step.title.toLowerCase()}, abra as Configurações do Android e ative a permissão manualmente. Depois volte ao app.`
            : step.description}
        </p>
      </div>

      <div className="px-6 pb-8 flex flex-col gap-3">
        {denied ? (
          <>
            <button
              onClick={openSettings}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:opacity-80"
            >
              <SettingsIcon className="h-5 w-5" />
              Abrir Configurações
            </button>
            <button
              onClick={advance}
              className="w-full h-11 text-muted-foreground text-sm font-medium"
            >
              Continuar mesmo assim
            </button>
          </>
        ) : (
          <>
            <button
              onClick={next}
              disabled={busy}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:opacity-80 disabled:opacity-50"
            >
              {step.cta}
              {!last && <ChevronRight className="h-5 w-5" />}
            </button>
            {!last && idx > 0 && (
              <button onClick={skip} className="w-full h-11 text-muted-foreground text-sm font-medium">
                Agora não
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
