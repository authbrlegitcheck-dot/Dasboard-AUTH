import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Target,
  Users,
  Store,
  TrendingUp,
  Wallet,
  Coins,
  Menu,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NavLink } from "@/components/NavLink";
import { formatDateBrasiliaOptions } from "@/lib/dateUtils";
import { ThemeModeSwitch } from "@/components/ThemeModeSwitch";
import { AuthWordmark } from "@/components/AuthWordmark";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/authentications", label: "Autenticações", icon: ShieldCheck },
  { to: "/crm", label: "CRM", icon: Users },
  { to: "/goals", label: "Metas", icon: Target },
  { to: "/partners", label: "Parceiros", icon: Store },
  { to: "/mrr", label: "MRR", icon: TrendingUp },
  { to: "/investments", label: "Investimentos", icon: Wallet },
  { to: "/packages-ca", label: "Pacotes CA", icon: Coins },
];

const navClass =
  "flex items-center gap-2 px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-300";
const navActive = "bg-muted/80 text-foreground";

const DashboardHeader = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Até logo!" });
    navigate("/auth");
  };

  return (
    <header className="border-b border-border/70 bg-card/85 backdrop-blur-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between py-3 sm:py-5">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <AuthWordmark className="shrink-0 h-8 sm:h-10" />
            <div className="min-w-0 border-l border-border/80 pl-3 sm:pl-5">
              <h1 className="font-semibold text-lg sm:text-[1.65rem] tracking-tight text-foreground leading-tight">
                Dashboard
              </h1>
              <p className="text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground hidden sm:block mt-0.5">
                Autenticação premium
              </p>
            </div>
          </div>

          {/* Right: date + theme + logout + hamburger */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Date — desktop only */}
            <div className="text-right hidden md:block">
              <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                Atualizado
              </p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {formatDateBrasiliaOptions(new Date(), {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <ThemeModeSwitch />

            {/* Logout — desktop only */}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="hidden sm:flex border-border/90 bg-background/50 text-[0.7rem] uppercase tracking-[0.1em] px-4 h-9 hover:bg-muted/80"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sair
            </Button>

            {/* Hamburger — mobile only */}
            <button
              className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex flex-wrap items-center gap-1 border-t border-border/50 pt-4 pb-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navClass}
              activeClassName={navActive}
            >
              <item.icon className="h-3.5 w-3.5 opacity-70" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border/50 bg-card/95 backdrop-blur-md">
          <nav className="container mx-auto px-4 py-2 flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
                activeClassName="bg-muted/80 text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                <item.icon className="h-4 w-4 opacity-70 shrink-0" />
                {item.label}
              </NavLink>
            ))}

            {/* Mobile: date + logout */}
            <div className="mt-2 pt-2 border-t border-border/50 px-4 pb-1">
              <p className="text-xs text-muted-foreground mb-3">
                {formatDateBrasiliaOptions(new Date(), {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <Button
                variant="outline"
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="w-full justify-center border-border/90 text-sm h-11"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
