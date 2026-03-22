import { cn } from "@/lib/utils";

/** Logótipo AUTH como imagem PNG. */
export function AuthWordmark({ className }: { className?: string }) {
  return (
    <img
      src="/auth-logo.png"
      alt="AUTH"
      aria-label="AUTH"
      className={cn("h-8 sm:h-10 w-auto select-none object-contain invert dark:invert-0 transition-all", className)}
    />
  );
}
