import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Calculator, PenTool } from "lucide-react";

// Hook personalizado para animação de criptografia
const useCrypticTextAnimation = (text: string, interval: number = 70) => {
  const [animatedText, setAnimatedText] = useState("");
  const [isAnimating, setIsAnimating] = useState(true);
  const chars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";

  useEffect(() => {
    let animationFrameId: number;
    let index = 0;
    let currentText = new Array(text.length).fill(null);

    const animate = () => {
      if (!isAnimating) {
        setAnimatedText(text);
        return;
      }

      for (let i = 0; i < text.length; i++) {
        if (currentText[i] === null) { // Somente criptografa caracteres ainda não revelados
          currentText[i] = chars[Math.floor(Math.random() * chars.length)];
        }
      }

      if (index < text.length) {
        currentText[index] = text[index];
        index++;
      } else {
        setIsAnimating(false);
      }

      setAnimatedText(currentText.join(""));
      animationFrameId = requestAnimationFrame(animate);
    };

    const timerId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(animate);
    }, 500); // Pequeno atraso antes de iniciar a animação

    return () => {
      clearTimeout(timerId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [text, isAnimating]);

  return animatedText;
};


const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const tagline = "Seus professores de inteligência artificial te esperam ✅";
  const animatedTagline = useCrypticTextAnimation(tagline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
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
          <Input placeholder="Seu nome" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="bg-christmas-input text-christmas-dark border-christmas-green placeholder:text-christmas-darker" />
        )}
        <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-christmas-input text-christmas-dark border-christmas-green placeholder:text-christmas-darker" />
        <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-christmas-input text-christmas-dark border-christmas-green placeholder:text-christmas-darker" />
        <Button type="submit" className="w-full bg-christmas-red hover:bg-christmas-red-dark text-white font-semibold shadow-md transition-all duration-300 transform hover:scale-105" disabled={loading}>
          {loading ? "Noel está a caminho..." : isLogin ? "Entrar" : "Criar conta"}
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