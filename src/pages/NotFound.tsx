import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn("404: Route not found");
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground mb-4">Erro</p>
        <h1 className="font-serif text-5xl font-medium text-foreground mb-4">404</h1>
        <p className="mb-8 text-muted-foreground leading-relaxed">Esta página não existe ou foi movida.</p>
        <a
          href="/"
          className="text-[0.7rem] uppercase tracking-[0.14em] text-foreground border-b border-foreground/40 pb-0.5 hover:border-foreground transition-colors"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
