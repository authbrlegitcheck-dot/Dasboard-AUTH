import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricAccent = "neutral" | "revenue" | "volume" | "insight";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Coloured edge only on the card — use for faturamento / KPIs-chave */
  accent?: MetricAccent;
  /** @deprecated use accent="revenue" */
  highlight?: boolean;
}

const accentStyles: Record<
  MetricAccent,
  { card: string; iconWrap: string; icon: string; value: string }
> = {
  neutral: {
    card: "border-border bg-card",
    iconWrap: "bg-muted text-foreground",
    icon: "text-foreground",
    value: "text-foreground",
  },
  revenue: {
    card: "border-border bg-card border-l-[3px] border-l-[hsl(var(--metric-revenue))]",
    iconWrap: "bg-muted text-[hsl(var(--metric-revenue))]",
    icon: "text-[hsl(var(--metric-revenue))]",
    value: "text-foreground",
  },
  volume: {
    card: "border-border bg-card border-l-[3px] border-l-[hsl(var(--metric-volume))]",
    iconWrap: "bg-muted text-[hsl(var(--metric-volume))]",
    icon: "text-[hsl(var(--metric-volume))]",
    value: "text-foreground",
  },
  insight: {
    card: "border-border bg-card border-l-[3px] border-l-[hsl(var(--metric-insight))]",
    iconWrap: "bg-muted text-[hsl(var(--metric-insight))]",
    icon: "text-[hsl(var(--metric-insight))]",
    value: "text-foreground",
  },
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accent,
  highlight,
}: MetricCardProps) => {
  const resolved: MetricAccent = accent ?? (highlight ? "revenue" : "neutral");
  const a = accentStyles[resolved];

  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-none border-border/70 transition-all duration-300 hover:border-border hover:bg-card",
        a.card,
      )}
    >
      <div className="p-6 md:p-7">
        <div className="flex items-start justify-between mb-5">
          <div className={cn("p-2 rounded-sm border border-border/40 bg-muted/40", a.iconWrap)}>
            <Icon className={cn("h-5 w-5", a.icon)} />
          </div>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-md border",
                trend.isPositive
                  ? "border-border bg-muted text-foreground"
                  : "border-border bg-muted text-destructive",
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
          )}
        </div>

        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground mb-2 font-medium">
            {title}
          </p>
          <p className={cn("font-serif text-2xl md:text-[1.75rem] font-semibold tracking-tight tabular-nums", a.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/90 mt-3 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;
