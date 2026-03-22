import { Card } from "@/components/ui/card";
import { FullscreenChartDialog, ExpandChartButton } from "@/components/FullscreenChartDialog";
import { TrendingUp, Target, Zap, Activity } from "lucide-react";
import { nowBrasilia } from "@/lib/dateUtils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  Line,
  CartesianGrid,
  Legend,
  Area,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { useState, useMemo } from "react";

interface MonthlyData {
  month: string;
  totalRevenue: number;
  authCount: number;
}

interface ProjectionChartsProps {
  monthlyData: MonthlyData[];
}

interface ProjectionData {
  month: string;
  revenue: number | null;
  authCount: number | null;
  projectedRevenue: number | null;
  projectedAuthCount: number | null;
  upperRevenue: number | null;
  lowerRevenue: number | null;
  upperAuth: number | null;
  lowerAuth: number | null;
  isProjection: boolean;
}

// Weighted linear regression — more recent months get higher weight
function weightedLinearRegression(
  values: number[]
): { slope: number; intercept: number; stdError: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, stdError: 0 };

  // Weights: most recent = n, oldest = 1
  const weights = values.map((_, i) => i + 1);
  const sumW = weights.reduce((a, b) => a + b, 0);

  let sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    sumWX += w * i;
    sumWY += w * values[i];
    sumWXX += w * i * i;
    sumWXY += w * i * values[i];
  }

  const denom = sumW * sumWXX - sumWX * sumWX;
  const slope = denom !== 0 ? (sumW * sumWXY - sumWX * sumWY) / denom : 0;
  const intercept = (sumWY - slope * sumWX) / sumW;

  // Standard error of residuals (for confidence band)
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    sse += (values[i] - predicted) ** 2;
  }
  const stdError = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;

  return { slope, intercept, stdError };
}

const ProjectionCharts = ({ monthlyData }: ProjectionChartsProps) => {
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);

  // Calculate projections using weighted linear regression over all historical data
  const projectionData = useMemo(() => {
    if (monthlyData.length < 2) return { data: [], projectedRevenue: 0, projectedAuthCount: 0, avgRevenue: 0, avgAuth: 0, growthRateRevenue: 0, growthRateAuth: 0 };

    const revenues = monthlyData.map((d) => d.totalRevenue);
    const authCounts = monthlyData.map((d) => d.authCount);

    const revRegression = weightedLinearRegression(revenues);
    const authRegression = weightedLinearRegression(authCounts);

    const n = monthlyData.length;

    // Show last 4 historical months + 3 projected
    const historyWindow = Math.min(4, n);
    const historicalSlice = monthlyData.slice(-historyWindow);

    const result: ProjectionData[] = [];

    historicalSlice.forEach((d, localIdx) => {
      const globalIdx = n - historyWindow + localIdx;
      const predicted = revRegression.intercept + revRegression.slope * globalIdx;
      const predictedAuth = authRegression.intercept + authRegression.slope * globalIdx;
      result.push({
        month: d.month,
        revenue: d.totalRevenue,
        authCount: d.authCount,
        projectedRevenue: null,
        projectedAuthCount: null,
        upperRevenue: null,
        lowerRevenue: null,
        upperAuth: null,
        lowerAuth: null,
        isProjection: false,
      });
      // Suppress unused vars
      void predicted; void predictedAuth;
    });

    // Generate next 3 months labels from last historical month
    const lastMonthData = historicalSlice[historicalSlice.length - 1];
    const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const lastLabel = lastMonthData.month.toLowerCase();
    let lastMonthIndex = monthNames.findIndex((m) => lastLabel.startsWith(m));
    let lastYear = 2026;
    const yearMatch = lastLabel.match(/(\d{2,4})$/);
    if (yearMatch) {
      lastYear = yearMatch[1].length === 2 ? 2000 + parseInt(yearMatch[1]) : parseInt(yearMatch[1]);
    }
    if (lastMonthIndex === -1) {
      const fallback = nowBrasilia();
      lastMonthIndex = fallback.getMonth();
      lastYear = fallback.getFullYear();
    }

    // Confidence multiplier (~1.28 for ~80% interval)
    const confidenceMult = 1.28;

    for (let i = 1; i <= 3; i++) {
      const futureMonthIndex = (lastMonthIndex + i) % 12;
      const futureYear = lastYear + Math.floor((lastMonthIndex + i) / 12);
      const monthLabel = `${monthNames[futureMonthIndex]}/${String(futureYear).slice(-2)}`;

      const projIdx = n - 1 + i;
      const projRev = Math.max(0, revRegression.intercept + revRegression.slope * projIdx);
      const projAuth = Math.max(0, Math.round(authRegression.intercept + authRegression.slope * projIdx));
      const revBand = revRegression.stdError * confidenceMult * Math.sqrt(1 + 1 / n + (i * i) / n);
      const authBand = authRegression.stdError * confidenceMult * Math.sqrt(1 + 1 / n + (i * i) / n);

      if (i === 1) {
        // Connect the line from the last real data point
        const lastReal = result[result.length - 1];
        lastReal.projectedRevenue = lastReal.revenue;
        lastReal.projectedAuthCount = lastReal.authCount;
        lastReal.upperRevenue = lastReal.revenue;
        lastReal.lowerRevenue = lastReal.revenue;
        lastReal.upperAuth = lastReal.authCount;
        lastReal.lowerAuth = lastReal.authCount;
      }

      result.push({
        month: monthLabel,
        revenue: null,
        authCount: null,
        projectedRevenue: projRev,
        projectedAuthCount: projAuth,
        upperRevenue: Math.max(0, projRev + revBand),
        lowerRevenue: Math.max(0, projRev - revBand),
        upperAuth: Math.max(0, Math.round(projAuth + authBand)),
        lowerAuth: Math.max(0, Math.round(projAuth - authBand)),
        isProjection: true,
      });
    }

    const nextMonthIdx = n;
    const projectedRevenue = Math.max(0, revRegression.intercept + revRegression.slope * nextMonthIdx);
    const projectedAuthCount = Math.max(0, Math.round(authRegression.intercept + authRegression.slope * nextMonthIdx));

    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / n;
    const avgAuth = authCounts.reduce((a, b) => a + b, 0) / n;

    return {
      data: result,
      projectedRevenue,
      projectedAuthCount,
      avgRevenue,
      avgAuth,
      growthRateRevenue: avgRevenue > 0 ? (revRegression.slope / avgRevenue) * 100 : 0,
      growthRateAuth: avgAuth > 0 ? (authRegression.slope / avgAuth) * 100 : 0,
    };
  }, [monthlyData]);

  const chartConfig = {
    revenue: {
      label: "Faturamento Real",
      color: "hsl(var(--success))",
    },
    projectedRevenue: {
      label: "Projeção",
      color: "hsl(var(--chart-4))",
    },
    authCount: {
      label: "Autenticações Real",
      color: "hsl(var(--primary))",
    },
    projectedAuthCount: {
      label: "Projeção",
      color: "hsl(var(--chart-4))",
    },
  };

  if (monthlyData.length < 2) {
    return null;
  }

  const totalProjected3Months = projectionData.data
    .filter((d) => d.isProjection)
    .reduce((sum, d) => sum + (d.projectedRevenue || 0), 0);

  const totalAuthProjected3Months = projectionData.data
    .filter((d) => d.isProjection)
    .reduce((sum, d) => sum + (d.projectedAuthCount || 0), 0);

  const RevenueChart = ({ height = "h-[420px]" }: { height?: string }) => (
    <ChartContainer config={chartConfig} className={`${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={projectionData.data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <defs>
            <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="projectionAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="confidenceBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} dy={15} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
          <ChartTooltip
            content={<ChartTooltipContent />}
            formatter={(value: number, name: string) => {
              const label = name.includes("projected") || name.includes("upper") || name.includes("lower") ? "Projeção" : "Real";
              return [`R$ ${value?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "-"}`, label];
            }}
            contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", padding: "14px 18px" }}
          />
          <Legend wrapperStyle={{ paddingTop: "25px" }} iconType="circle" iconSize={10}
            payload={[
              { value: "Faturamento Real", type: "circle", color: "hsl(var(--success))" },
              { value: "Projeção", type: "circle", color: "hsl(var(--chart-4))" },
              { value: "Intervalo de Confiança", type: "square", color: "hsl(var(--chart-4))" },
            ]}
          />
          <ReferenceLine y={projectionData.avgRevenue} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeOpacity={0.4} label={{ value: "Média", fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "right" }} />
          {/* Confidence band */}
          <Area type="monotone" dataKey="upperRevenue" fill="url(#confidenceBandGradient)" stroke="hsl(var(--chart-4))" strokeWidth={0.5} strokeDasharray="3 3" strokeOpacity={0.4} legendType="none" connectNulls={false} />
          <Area type="monotone" dataKey="lowerRevenue" fill="hsl(var(--background))" stroke="hsl(var(--chart-4))" strokeWidth={0.5} strokeDasharray="3 3" strokeOpacity={0.4} legendType="none" connectNulls={false} />
          {/* Main areas */}
          <Area type="monotone" dataKey="revenue" fill="url(#revenueAreaGradient)" stroke="none" legendType="none" />
          <Area type="monotone" dataKey="projectedRevenue" fill="url(#projectionAreaGradient)" stroke="none" legendType="none" />
          {/* Lines */}
          <Line type="monotone" dataKey="revenue" name="Faturamento Real" stroke="hsl(var(--success))" strokeWidth={3} dot={{ fill: "hsl(var(--success))", strokeWidth: 3, r: 5, stroke: "hsl(var(--background))" }} activeDot={{ r: 8, fill: "hsl(var(--success))", stroke: "hsl(var(--background))", strokeWidth: 4 }} connectNulls={false} />
          <Line type="monotone" dataKey="projectedRevenue" name="Projeção" stroke="hsl(var(--chart-4))" strokeWidth={3} strokeDasharray="8 4" dot={{ fill: "hsl(var(--chart-4))", strokeWidth: 3, r: 5, stroke: "hsl(var(--background))" }} activeDot={{ r: 8, fill: "hsl(var(--chart-4))", stroke: "hsl(var(--background))", strokeWidth: 4 }} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );

  const AuthChart = ({ height = "h-[420px]" }: { height?: string }) => (
    <ChartContainer config={chartConfig} className={`${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={projectionData.data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
          <defs>
            <linearGradient id="authAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="authProjectionAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="authConfidenceBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} dy={15} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
          <ChartTooltip
            content={<ChartTooltipContent />}
            formatter={(value: number, name: string) => {
              const label = name.includes("projected") || name.includes("upper") || name.includes("lower") ? "Projeção" : "Real";
              return [`${value ?? "-"} autenticações`, label];
            }}
            contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", padding: "14px 18px" }}
          />
          <Legend wrapperStyle={{ paddingTop: "25px" }} iconType="circle" iconSize={10}
            payload={[
              { value: "Autenticações Real", type: "circle", color: "hsl(var(--primary))" },
              { value: "Projeção", type: "circle", color: "hsl(var(--chart-4))" },
              { value: "Intervalo de Confiança", type: "square", color: "hsl(var(--chart-4))" },
            ]}
          />
          <ReferenceLine y={projectionData.avgAuth} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeOpacity={0.4} label={{ value: "Média", fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "right" }} />
          {/* Confidence band */}
          <Area type="monotone" dataKey="upperAuth" fill="url(#authConfidenceBandGradient)" stroke="hsl(var(--chart-4))" strokeWidth={0.5} strokeDasharray="3 3" strokeOpacity={0.4} legendType="none" connectNulls={false} />
          <Area type="monotone" dataKey="lowerAuth" fill="hsl(var(--background))" stroke="hsl(var(--chart-4))" strokeWidth={0.5} strokeDasharray="3 3" strokeOpacity={0.4} legendType="none" connectNulls={false} />
          {/* Main areas */}
          <Area type="monotone" dataKey="authCount" fill="url(#authAreaGradient)" stroke="none" legendType="none" />
          <Area type="monotone" dataKey="projectedAuthCount" fill="url(#authProjectionAreaGradient)" stroke="none" legendType="none" />
          {/* Lines */}
          <Line type="monotone" dataKey="authCount" name="Autenticações Real" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", strokeWidth: 3, r: 5, stroke: "hsl(var(--background))" }} activeDot={{ r: 8, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 4 }} connectNulls={false} />
          <Line type="monotone" dataKey="projectedAuthCount" name="Projeção" stroke="hsl(var(--chart-4))" strokeWidth={3} strokeDasharray="8 4" dot={{ fill: "hsl(var(--chart-4))", strokeWidth: 3, r: 5, stroke: "hsl(var(--background))" }} activeDot={{ r: 8, fill: "hsl(var(--chart-4))", stroke: "hsl(var(--background))", strokeWidth: 4 }} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="border-t border-border/50 pt-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-chart-4/20 to-chart-4/5 border border-chart-4/20">
            <Target className="h-6 w-6 text-chart-4" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">Projeções de Crescimento</h3>
        </div>
        <p className="text-muted-foreground ml-14">
          Regressão linear ponderada sobre todo o histórico — meses mais recentes têm maior peso. Bandas de confiança indicam a incerteza das projeções.
        </p>
      </div>

      {/* Projection Metrics — 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-chart-4/10 to-card border-chart-4/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-chart-4/20">
              <TrendingUp className="h-5 w-5 text-chart-4" />
            </div>
            <span className="text-sm text-muted-foreground">Projeção Próx. Mês</span>
          </div>
          <p className="text-3xl font-bold text-chart-4">
            R$ {(projectionData.projectedRevenue / 1000).toFixed(1)}k
          </p>
          <p className="text-xs text-muted-foreground mt-1">faturamento estimado</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/10 to-card border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Projeção Autenticações</span>
          </div>
          <p className="text-3xl font-bold text-primary">
            {projectionData.projectedAuthCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">autenticações estimadas</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-success/10 to-card border-success/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-success/20">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">Tendência Receita</span>
          </div>
          <p className={`text-3xl font-bold ${projectionData.growthRateRevenue >= 0 ? "text-success" : "text-destructive"}`}>
            {projectionData.growthRateRevenue > 0 ? "+" : ""}{projectionData.growthRateRevenue.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">crescimento mensal estimado</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-chart-4/10 to-card border-chart-4/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-chart-4/20">
              <Activity className="h-5 w-5 text-chart-4" />
            </div>
            <span className="text-sm text-muted-foreground">Acumulado 3 Meses</span>
          </div>
          <p className="text-3xl font-bold text-chart-4">
            R$ {(totalProjected3Months / 1000).toFixed(1)}k
          </p>
          <p className="text-xs text-muted-foreground mt-1">{totalAuthProjected3Months} auths projetadas</p>
        </Card>
      </div>

      {/* Revenue Projection Chart */}
      <Card className="p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-to-br from-card via-card to-card/90">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-chart-4/20 to-chart-4/5 border border-chart-4/20">
              <TrendingUp className="h-6 w-6 text-chart-4" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Projeção de Faturamento</h3>
              <p className="text-sm text-muted-foreground">Tendência com projeção de 3 meses e intervalo de confiança</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right bg-chart-4/10 rounded-xl px-5 py-3 border border-chart-4/20">
              <p className="text-sm text-muted-foreground">Projeção 3 Meses</p>
              <p className="text-2xl font-bold text-chart-4">
                R$ {(totalProjected3Months / 1000).toFixed(1)}k
              </p>
            </div>
            <ExpandChartButton onClick={() => setFullscreenChart("revenue-projection")} />
          </div>
        </div>
        <RevenueChart />
      </Card>

      {/* Auth Count Projection Chart */}
      <Card className="p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-to-br from-card via-card to-card/90">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Projeção de Autenticações</h3>
              <p className="text-sm text-muted-foreground">Tendência de volume com projeção de 3 meses e intervalo de confiança</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right bg-primary/10 rounded-xl px-5 py-3 border border-primary/20">
              <p className="text-sm text-muted-foreground">Projeção 3 Meses</p>
              <p className="text-2xl font-bold text-primary">
                {totalAuthProjected3Months} auths
              </p>
            </div>
            <ExpandChartButton onClick={() => setFullscreenChart("auth-projection")} />
          </div>
        </div>
        <AuthChart />
      </Card>

      {/* Fullscreen Dialogs */}
      <FullscreenChartDialog
        open={fullscreenChart === "revenue-projection"}
        onOpenChange={(open) => !open && setFullscreenChart(null)}
        title="Projeção de Faturamento"
        subtitle="Regressão linear ponderada com intervalo de confiança"
        icon={<TrendingUp className="h-5 w-5 text-chart-4" />}
      >
        <RevenueChart height="h-full" />
      </FullscreenChartDialog>

      <FullscreenChartDialog
        open={fullscreenChart === "auth-projection"}
        onOpenChange={(open) => !open && setFullscreenChart(null)}
        title="Projeção de Autenticações"
        subtitle="Regressão linear ponderada com intervalo de confiança"
        icon={<Zap className="h-5 w-5 text-primary" />}
      >
        <AuthChart height="h-full" />
      </FullscreenChartDialog>
    </div>
  );
};

export default ProjectionCharts;
