import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Calculator, PenTool, Camera } from "lucide-react"; // Importar Camera icon
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Hook personalizado para animaÃÆÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ£o de criptografia contÃÆÃÂÃÂÃÂ­nua
const useContinuousCrypticTextAnimation = (text: string, charInterval: number = 70, displayDuration: number = 2000) => {
  const [animatedText, setAnimatedText] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const textRef = useRef(text); // Usamos uma ref para o texto original
  const animationTimeoutRef = useRef<number | null>(null);
  const chars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";

  useEffect(() => {
    textRef.current = text; // Atualiza a ref se o texto mudar
  }, [text]);

  useEffect(() => {
    let animationFrameId: number;
    let charIndex = 0;
    let revealTimer: number;

    const encryptAndReveal = () => {
      const currentText = Array(textRef.current.length).fill('');
      let tempText = "";

      const encryptStep = () => {
        tempText = "";
        for (let i = 0; i < textRef.current.length; i++) {
          if (i < charIndex) {
            tempText += textRef.current[i];
          } else {
            tempText += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        setAnimatedText(tempText);

        if (charIndex < textRef.current.length) {
          charIndex++;
          animationFrameId = requestAnimationFrame(() => setTimeout(encryptStep, charInterval));
        } else {
          // Revertendo a criptografia
          revealTimer = setTimeout(() => {
            const decryptStep = () => {
              tempText = "";
              for (let i = 0; i < textRef.current.length; i++) {
                if (i < charIndex) {
                  tempText += textRef.current[i];
                } else {
                  tempText += chars[Math.floor(Math.random() * chars.length)];
                }
              }
              setAnimatedText(tempText);

              if (charIndex > 0) {
                charIndex--;
                animationFrameId = requestAnimationFrame(() => setTimeout(decryptStep, charInterval));
              } else {
                // Totalmente descriptografado, exiba por displayDuration
                setAnimatedText(textRef.current);
                animationTimeoutRef.current = setTimeout(() => {
                  setIsEncrypting(true); // Preparar para a prÃ³xima criptografia
                  charIndex = 0;
                  requestAnimationFrame(() => setTimeout(encryptStep, charInterval));
                }, displayDuration) as unknown as number;
              }
            };
            decryptStep();
          }, displayDuration) as unknown as number; // Tempo para exibir o texto criptografado
        }
      };

    if (isEncrypting) {
        setAnimatedText(textRef.current); // Garante que o texto original apareÃ§a primeiro
        charIndex = textRef.current.length; // ComeÃ§a revelado para entÃ£o criptografar
        animationTimeoutRef.current = setTimeout(() => {
          setIsEncrypting(false); // Inicia a criptografia
          encryptStep();
        }, displayDuration) as unknown as number;
      } else {
        encryptStep(); // Inicia a criptografia
      }
    };

    setIsEncrypting(true); // ComeÃ§a com o texto normal
    encryptAndReveal();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [charInterval, displayDuration]);

  return animatedText;
};

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const tagline = "Seus professores de inteligência artificial te esperam ✅";
  const animatedTagline = useContinuousCrypticTextAnimation(tagline);

  useEffect(() => {
    // Carregar os modelos do face-api.js
    const loadModels = async () => {
      // @ts-ignore
      await Promise.all([
        // @ts-ignore
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        // @ts-ignore
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        // @ts-ignore
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        // @ts-ignore
        faceapi.nets.faceExpressionNet.loadFromUri('/models'),
      ]);
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    setFaceDetected(false);
    setIsModalOpen(true); // Abre o modal
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
        };
      }
    } catch (err) {
      console.error("Erro ao acessar a cÃ¢mera:", err);
      toast({ title: "Erro", description: "Não foi possível acessar a câmera. Verifique as permissões.", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      // @ts-ignore
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleModalClose = () => {
    stopCamera();
    setIsModalOpen(false);
  }

  const detectFacesInModal = async () => {
    if (!videoRef.current || !isCameraActive) {
      toast({ title: "Erro", description: "Câmera não está ativa.", variant: "destructive" });
      return;
    }

    const detections = await faceapi
      // @ts-ignore
      .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (detections.length > 0) {
      setFaceDetected(true);
      toast({ title: "Sucesso!", description: "Rosto detectado com sucesso.", variant: "success" });
      stopCamera();
      setIsModalOpen(false);
    } else {
      toast({ title: "Aviso", description: "Nenhum rosto detectado. Tente novamente.", variant: "warning" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!faceDetected) {
          toast({ title: "Erro", description: "Por favor, complete a verificação facial.", variant: "destructive" });
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
        toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar." });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center christmas-bg px-4 py-12">
      <div className="mb-8 text-center relative z-10">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Calculator className="h-7 w-7 text-christmas-gold" />
          <PenTool className="h-7 w-7 text-christmas-gold" />
          <BookOpen className="h-7 w-7 text-christmas-gold" />
        </div>
        <h1 className="font-display text-4xl font-bold text-christmas-red drop-shadow-md">JTC OmniaEdu</h1>
        <p className="mt-2 text-lg text-christmas-white">{animatedTagline}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-christmas-green bg-christmas-card p-8 shadow-lg relative z-10">
        {!isLogin && (
          <>
            <Input placeholder="Seu nome" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="bg-christmas-input text-christmas-dark border-christmas-green placeholder:text-christmas-darker" />
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  onClick={startCamera}
                  className="w-full bg-christmas-green hover:bg-christmas-green-dark text-white font-semibold flex items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  {faceDetected ? "Rosto Reconhecido!" : "Reconhecimento Facial"}
                </Button>
              </DialogTrigger>
              <DialogContent onEscapeKeyDown={handleModalClose} onPointerDownOutside={handleModalClose}>
                <DialogHeader>
                  <DialogTitle>Reconhecimento Facial</DialogTitle>
                  <DialogDescription>
                    Posicione seu rosto na câmera e clique em "Reconhecer Rosto".
                  </DialogDescription>
                </DialogHeader>
                <div className="relative w-full h-64 bg-black rounded-md overflow-hidden flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover"></video>
                  {isCameraActive && !faceDetected && <span className="absolute text-white text-sm">Procurando rosto...</span>}
                  {faceDetected && <span className="absolute text-green-400 text-lg font-bold">Rosto Detectado!</span>}
                  {!isCameraActive && !faceDetected && <span className="absolute text-white text-sm">Aguardando câmera...</span>}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={detectFacesInModal}
                    className="bg-christmas-red hover:bg-christmas-red-dark text-white font-semibold"
                    disabled={!isCameraActive || faceDetected}
                  >
                    Reconhecer Rosto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleModalClose}
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {faceDetected && (
              <p className="text-center text-sm text-green-400">Verificação facial concluída!</p>
            )}
          </>
        )}
        <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-christmas-input text-christmas-dark border-christmas-green placeholder:text-christmas-darker" />
        <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-christmas-input text-christmas-dark border-christmas-green placeholder:text-christmas-darker" />
        <Button type="submit" className="w-full bg-christmas-red hover:bg-christmas-red-dark text-white font-semibold shadow-md transition-all duration-300 transform hover:scale-105" disabled={loading}>
          {loading ? "Noel estÃ¡ a caminho..." : isLogin ? "Entrar" : "Criar conta"}
        </Button>
        <p className="text-center text-sm text-christmas-darker">
          {isLogin ? "Não tem conta? " : "Já tem conta? "}
          <button type="button" className="font-semibold text-christmas-green hover:underline hover:text-christmas-red transition-colors duration-200" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </form>
    </div>
  );
};

export default AuthPage;