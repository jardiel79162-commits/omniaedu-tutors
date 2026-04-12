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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Calculator className="h-7 w-7 text-math" />
          <PenTool className="h-7 w-7 text-calligraphy" />
          <BookOpen className="h-7 w-7 text-reading" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">JTC OmniaEdu</h1>
        <p className="mt-1 text-sm text-muted-foreground">Seus professores de IA te esperam 🎓</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        {!isLogin && (
          <Input placeholder="Seu nome" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        )}
        <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Aguarde…" : isLogin ? "Entrar" : "Criar conta"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Não tem conta? " : "Já tem conta? "}
          <button type="button" className="font-semibold text-primary underline" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </form>
    </div>
  );
};

export default AuthPage;
