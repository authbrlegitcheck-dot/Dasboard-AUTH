import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeModeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Sun
        className={cn("h-4 w-4 text-muted-foreground", isDark && "opacity-35")}
        aria-hidden
      />
      <Switch
        checked={mounted && isDark}
        onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
        disabled={!mounted}
        aria-label={isDark ? "Alternar para modo claro" : "Alternar para modo escuro"}
      />
      <Moon
        className={cn("h-4 w-4 text-muted-foreground", !isDark && "opacity-35")}
        aria-hidden
      />
    </div>
  );
}
