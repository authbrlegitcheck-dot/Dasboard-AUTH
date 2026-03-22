import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThemeModeSwitch } from "@/components/ThemeModeSwitch";
import { AuthWordmark } from "@/components/AuthWordmark";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || trimmedEmail.length > 255) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Email inválido",
      });
      return;
    }
    
    if (password.length < 6 || password.length > 128) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Senha deve ter entre 6 e 128 caracteres",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao dashboard AUTH",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao fazer login";
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: errorMessage.includes("Invalid login") 
          ? "Email ou senha incorretos" 
          : "Erro ao fazer login. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-dark p-4">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeModeSwitch />
      </div>
      <Card className="w-full max-w-md p-10 bg-card/90 backdrop-blur-sm border-border/80 shadow-none">
        <div className="flex flex-col items-center mb-10">
          <AuthWordmark className="text-[2.15rem] sm:text-[2.35rem] mb-8" />
          <h1 className="font-serif text-3xl font-medium text-foreground">Entrar</h1>
          <p className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground mt-3 text-center max-w-xs">
            Acesso à plataforma de autenticação
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
              placeholder="seu@email.com"
              maxLength={255}
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
              placeholder="••••••••"
              minLength={6}
              maxLength={128}
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-[0.7rem] uppercase tracking-[0.14em] h-11"
            disabled={loading}
          >
            {loading ? "Processando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
