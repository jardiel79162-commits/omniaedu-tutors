import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Calculator, PenTool } from "lucide-react";

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

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
        <p className="mt-2 text-lg text-christmas-white">Seus professores de IA te esperam <span className="text-christmas-gold">🎁</span></p>
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