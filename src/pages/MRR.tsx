import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  currentMonthBrasilia,
  formatDateBrasilia,
  yearMonthKeyBrasilia,
  prevYearMonthKey,
  daysInMonth,
  dateKeyBrasilia,
} from "@/lib/dateUtils";
import DashboardHeader from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import MetricCard from "@/components/MetricCard";
import CAPackageAnalytics from "@/components/CAPackageAnalytics";
import ProjectionCharts from "@/components/ProjectionCharts";
import { FullscreenChartDialog, ExpandChartButton } from "@/components/FullscreenChartDialog";
import { TrendingUp, DollarSign, Calendar, Users, Store, Percent, Wallet, BarChart3 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Area, ComposedChart } from "recharts";

interface MonthlyData {
  month: string;
  regularRevenue: number;
  partnerRevenue: number;
  totalRevenue: number;
  authCount: number;
}

const MRR = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [metrics, setMetrics] = useState({
    currentMRR: 0,
    previousMRR: 0,
    growth: 0,
    avgMRR: 0,
    regularMRR: 0,
    partnerMRR: 0,
  });
  const [totalInvestments, setTotalInvestments] = useState(0);
  const [currentMonthInvestments, setCurrentMonthInvestments] = useState(0);
  const [caPurchases, setCaPurchases] = useState<any[]>([]);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchMRRData();
    };
    checkAuth();
  }, [navigate]);

  const fetchMRRData = async () => {
    try {
      const [{ data: authentications }, { data: investments }, { data: caData }] = await Promise.all([
        supabase
          .from("authentications")
          .select("*")
          .order("date", { ascending: true }),
        supabase
          .from("investments")
          .select("*"),
        supabase
          .from("ca_purchases")
          .select("*, ca_packages(name, credits, price)")
          .order("purchase_date", { ascending: true }),
      ]);

      setCaPurchases(caData || []);

      if (!authentications) return;

      // Calculate total and current month investments
      const currentMonth = currentMonthBrasilia();
      const totalInv = investments?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const currentMonthInv = investments
        ?.filter((inv) => inv.date.startsWith(currentMonth))
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      setTotalInvestments(totalInv);
      setCurrentMonthInvestments(currentMonthInv);

      // Group by month
      const monthlyMap = new Map<string, MonthlyData>();
      
      authentications.forEach((auth) => {
        const monthKey = yearMonthKeyBrasilia(auth.date);
        const [yy, mm] = monthKey.split("-").map(Number);
        const monthLabel = new Date(yy, mm - 1, 1).toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        });
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthLabel,
            regularRevenue: 0,
            partnerRevenue: 0,
            totalRevenue: 0,
            authCount: 0,
          });
        }
        
        const data = monthlyMap.get(monthKey)!;
        const price = Number(auth.price);
        
        if (auth.partner_store_id) {
          data.partnerRevenue += price;
        } else {
          data.regularRevenue += price;
        }
        data.totalRevenue += price;
        data.authCount += 1;
      });

      const sortedData = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, data]) => data);

      // Build cumulative revenue series
      let cumulative = 0;
      const sortedDataWithCumulative = sortedData.map((d) => {
        cumulative += d.totalRevenue;
        return { ...d, cumulativeRevenue: cumulative };
      });

      setMonthlyData(sortedDataWithCumulative as any);

      const todayStr = formatDateBrasilia(new Date(), "yyyy-MM-dd");
      const currentMonthKey = currentMonthBrasilia();
      const currentDay = parseInt(todayStr.slice(8, 10), 10);
      const prevMonthKey = prevYearMonthKey(currentMonthKey);

      const currentData = monthlyMap.get(currentMonthKey);
      const prevData = monthlyMap.get(prevMonthKey);

      const currentMRR = currentData?.totalRevenue || 0;
      const previousMRR = prevData?.totalRevenue || 0;

      const mtdRevenue = (ym: string, maxDayInclusive: number) => {
        const [y, m] = ym.split("-").map(Number);
        const dim = daysInMonth(y, m);
        const endDay = Math.min(maxDayInclusive, dim);
        const start = `${ym}-01`;
        const end = `${ym}-${String(endDay).padStart(2, "0")}`;
        return authentications
          .filter((auth) => {
            const dk = dateKeyBrasilia(auth.date);
            return dk >= start && dk <= end;
          })
          .reduce((sum, auth) => sum + Number(auth.price), 0);
      };

      const currentMonthElapsedRevenue = mtdRevenue(currentMonthKey, currentDay);
      const prevMonthElapsedRevenue = mtdRevenue(prevMonthKey, currentDay);

      const growth =
        prevMonthElapsedRevenue > 0
          ? ((currentMonthElapsedRevenue - prevMonthElapsedRevenue) / prevMonthElapsedRevenue) * 100
          : currentMonthElapsedRevenue > 0
            ? 100
            : 0;

      const last6Months = sortedData.slice(-6);
      const avgMRR =
        last6Months.length > 0
          ? last6Months.reduce((sum, d) => sum + d.totalRevenue, 0) / last6Months.length
          : 0;
      const regularMRR = currentData?.regularRevenue || 0;
      const partnerMRR = currentData?.partnerRevenue || 0;

      setMetrics({
        currentMRR,
        previousMRR,
        growth,
        avgMRR,
        regularMRR,
        partnerMRR,
      });
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    regularRevenue: {
      label: "AUTH Regular",
      color: "hsl(var(--chart-1))",
    },
    partnerRevenue: {
      label: "Parceiros",
      color: "hsl(var(--chart-2))",
    },
    totalRevenue: {
      label: "Total",
      color: "hsl(var(--chart-3))",
    },
    cumulativeRevenue: {
      label: "Acumulado",
      color: "hsl(var(--chart-5, 262 80% 65%))",
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const totalHistoricalRevenue = monthlyData.reduce((sum, d) => sum + d.totalRevenue, 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="font-serif text-3xl font-medium text-foreground mb-2">MRR — receita mensal</h2>
          <p className="text-muted-foreground">Meses agrupados no fuso de Brasília; crescimento é MTD vs. MTD.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="MRR atual"
            value={`R$ ${metrics.currentMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="Receita no mês corrente até hoje (Brasília)"
            icon={DollarSign}
            accent="revenue"
            trend={metrics.growth !== 0 ? { value: Math.round(metrics.growth), isPositive: metrics.growth > 0 } : undefined}
          />
          <MetricCard
            title="MRR mês anterior"
            value={`R$ ${metrics.previousMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="Receita total do mês passado (calendário completo)"
            icon={Calendar}
            accent="neutral"
          />
          <MetricCard
            title="MRR AUTH regular"
            value={`R$ ${metrics.regularMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="No mês atual, sem parceiros"
            icon={Users}
            accent="volume"
          />
          <MetricCard
            title="MRR parceiros"
            value={`R$ ${metrics.partnerMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="No mês atual, lojas parceiras"
            icon={Store}
            accent="insight"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="MRR médio"
            value={`R$ ${metrics.avgMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="Média dos últimos 6 meses"
            icon={TrendingUp}
            accent="insight"
          />
          <MetricCard
            title="Faturamento líquido (mês)"
            value={`R$ ${(metrics.currentMRR - currentMonthInvestments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="Receita do mês atual − investimentos lançados neste mês"
            icon={Wallet}
            accent="revenue"
          />
          <MetricCard
            title="Margem (mês)"
            value={`${metrics.currentMRR > 0 ? (((metrics.currentMRR - currentMonthInvestments) / metrics.currentMRR) * 100).toFixed(1) : "0"}%`}
            subtitle="Faturamento líquido ÷ receita bruta do mês"
            icon={Percent}
            accent="neutral"
            trend={metrics.currentMRR > 0 ? { 
              value: Math.round(((metrics.currentMRR - currentMonthInvestments) / metrics.currentMRR) * 100), 
              isPositive: (metrics.currentMRR - currentMonthInvestments) >= 0 
            } : undefined}
          />
          <MetricCard
            title="Margem geral (histórico)"
            value={`${totalHistoricalRevenue > 0
              ? (((totalHistoricalRevenue - totalInvestments) / totalHistoricalRevenue) * 100).toFixed(1)
              : "0"}%`}
            subtitle="(Soma de todas as receitas mensais − investimentos acumulados) ÷ receita histórica"
            icon={Percent}
            accent="neutral"
          />
        </div>

        {/* Charts Section */}
        <div className="space-y-8">
          {/* Stacked Bar Chart - Full Width Enhanced */}
          <Card className="p-8 border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-md bg-muted border border-border">
                  <DollarSign className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Receita mensal por tipo</h3>
                  <p className="text-sm text-muted-foreground">AUTH regular vs. parceiros</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-6">
                  <div className="text-right bg-muted rounded-md px-4 py-2 border border-border">
                    <p className="text-xs text-muted-foreground">AUTH Regular</p>
                    <p className="text-xl font-semibold text-foreground">
                      R$ {(monthlyData.reduce((sum, d) => sum + d.regularRevenue, 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="text-right bg-muted rounded-md px-4 py-2 border border-border">
                    <p className="text-xs text-muted-foreground">Parceiros</p>
                    <p className="text-xl font-semibold text-foreground">
                      R$ {(monthlyData.reduce((sum, d) => sum + d.partnerRevenue, 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>
                <ExpandChartButton onClick={() => setFullscreenChart('revenue-type')} />
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                  <defs>
                    <linearGradient id="regularGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={1}/>
                      <stop offset="50%" stopColor="hsl(var(--chart-1))" stopOpacity={0.85}/>
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="partnerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={1}/>
                      <stop offset="50%" stopColor="hsl(var(--chart-2))" stopOpacity={0.85}/>
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="totalLineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.5}/>
                      <stop offset="50%" stopColor="hsl(var(--chart-3))" stopOpacity={1}/>
                      <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.5}/>
                    </linearGradient>
                    <filter id="barGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                    dy={15}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                    dx={-5}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                      padding: "14px 18px"
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: "25px" }}
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                  />
                  <Bar 
                    dataKey="regularRevenue" 
                    name="AUTH Regular"
                    stackId="revenue"
                    fill="url(#regularGradient)" 
                    radius={[0, 0, 0, 0]}
                    maxBarSize={50}
                  />
                  <Bar 
                    dataKey="partnerRevenue" 
                    name="Parceiros"
                    stackId="revenue"
                    fill="url(#partnerGradient)" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={50}
                  />
                  <Line 
                    type="monotone"
                    dataKey="totalRevenue" 
                    name="Total"
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={false}
                    opacity={0.7}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>

          {/* Line Chart - MRR Evolution - Full Width Enhanced */}
          <Card className="p-8 border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-md bg-muted border border-border">
                  <TrendingUp className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Evolução do MRR total</h3>
                  <p className="text-sm text-muted-foreground">Soma mensal ao longo do tempo</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right bg-muted rounded-md px-5 py-3 border border-border">
                  <p className="text-sm text-muted-foreground">Total acumulado</p>
                  <p className="text-3xl font-semibold text-foreground">
                    R$ {(monthlyData.reduce((sum, d) => sum + d.totalRevenue, 0) / 1000).toFixed(1)}k
                  </p>
                </div>
                <ExpandChartButton onClick={() => setFullscreenChart('mrr-evolution')} />
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                  <defs>
                    <linearGradient id="mrrAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.35}/>
                      <stop offset="30%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                    </linearGradient>
                    <filter id="mrrGlow">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                    dy={15}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                    dx={-5}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    cursor={{ stroke: 'hsl(var(--chart-3))', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                      padding: "14px 18px"
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: "25px" }}
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                  />
                  <Area 
                    type="monotone"
                    dataKey="totalRevenue" 
                    name="MRR Total"
                    fill="url(#mrrAreaGradient)"
                    stroke="none"
                  />
                  <Line 
                    type="monotone"
                    dataKey="totalRevenue" 
                    name="MRR Total"
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 5, stroke: 'hsl(var(--background))' }}
                    activeDot={{ r: 8, fill: 'hsl(var(--chart-3))', stroke: 'hsl(var(--background))', strokeWidth: 2, filter: 'url(#mrrGlow)' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>

          {/* Cumulative Revenue Chart */}
          <Card className="p-8 border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-md bg-muted border border-border">
                  <BarChart3 className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Receita acumulada</h3>
                  <p className="text-sm text-muted-foreground">Total histórico somado mês a mês</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right bg-muted rounded-md px-5 py-3 border border-border">
                  <p className="text-sm text-muted-foreground">Acumulado total</p>
                  <p className="text-3xl font-semibold text-foreground">
                    R$ {(totalHistoricalRevenue / 1000).toFixed(1)}k
                  </p>
                </div>
                <ExpandChartButton onClick={() => setFullscreenChart('cumulative-revenue')} />
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                  <defs>
                    <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(262, 80%, 65%)" stopOpacity={0.45}/>
                      <stop offset="50%" stopColor="hsl(262, 80%, 65%)" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="hsl(262, 80%, 65%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                    dy={15}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                    dx={-5}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    cursor={{ stroke: 'hsl(262, 80%, 65%)', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                      padding: "14px 18px"
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "25px" }}
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeRevenue"
                    name="Acumulado"
                    fill="url(#cumulativeGradient)"
                    stroke="hsl(262, 80%, 65%)"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(262, 80%, 65%)', strokeWidth: 2, r: 5, stroke: 'hsl(var(--background))' }}
                    activeDot={{ r: 8, fill: 'hsl(262, 80%, 65%)', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>
        </div>

        {/* Projection Charts Section */}
        <ProjectionCharts monthlyData={monthlyData} />

        {/* CA Package Analytics Section */}
        <CAPackageAnalytics caPurchases={caPurchases} monthlyData={monthlyData} />

        {/* Fullscreen Chart Dialogs */}
        <FullscreenChartDialog
          open={fullscreenChart === 'revenue-type'}
          onOpenChange={(open) => !open && setFullscreenChart(null)}
          title="Receita Mensal por Tipo"
          subtitle="Comparativo entre AUTH Regular e Parceiros"
          icon={<DollarSign className="h-5 w-5 text-foreground" />}
        >
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <defs>
                  <linearGradient id="regularGradientFS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={1}/>
                    <stop offset="50%" stopColor="hsl(var(--chart-1))" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5}/>
                  </linearGradient>
                  <linearGradient id="partnerGradientFS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={1}/>
                    <stop offset="50%" stopColor="hsl(var(--chart-2))" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  dy={15}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: "25px" }}
                  iconType="circle"
                  iconSize={12}
                />
                <Bar 
                  dataKey="regularRevenue" 
                  name="AUTH Regular"
                  stackId="revenue"
                  fill="url(#regularGradientFS)" 
                  radius={[0, 0, 0, 0]}
                  maxBarSize={60}
                />
                <Bar 
                  dataKey="partnerRevenue" 
                  name="Parceiros"
                  stackId="revenue"
                  fill="url(#partnerGradientFS)" 
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
                <Line 
                  type="monotone"
                  dataKey="totalRevenue" 
                  name="Total"
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  opacity={0.7}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </FullscreenChartDialog>

        <FullscreenChartDialog
          open={fullscreenChart === 'mrr-evolution'}
          onOpenChange={(open) => !open && setFullscreenChart(null)}
          title="Evolução do MRR Total"
          subtitle="Tendência de receita ao longo do tempo"
          icon={<TrendingUp className="h-5 w-5 text-foreground" />}
        >
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <defs>
                  <linearGradient id="mrrAreaGradientFS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.35}/>
                    <stop offset="30%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  dy={15}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  cursor={{ stroke: 'hsl(var(--chart-3))', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: "25px" }}
                  iconType="circle"
                  iconSize={12}
                />
                <Area 
                  type="monotone"
                  dataKey="totalRevenue" 
                  name="MRR Total"
                  fill="url(#mrrAreaGradientFS)"
                  stroke="none"
                />
                <Line 
                  type="monotone"
                  dataKey="totalRevenue" 
                  name="MRR Total"
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 6, stroke: 'hsl(var(--background))' }}
                  activeDot={{ r: 10, fill: 'hsl(var(--chart-3))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </FullscreenChartDialog>
        <FullscreenChartDialog
          open={fullscreenChart === 'cumulative-revenue'}
          onOpenChange={(open) => !open && setFullscreenChart(null)}
          title="Receita Acumulada"
          subtitle="Total histórico somado mês a mês"
          icon={<BarChart3 className="h-5 w-5 text-foreground" />}
        >
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <defs>
                  <linearGradient id="cumulativeGradientFS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262, 80%, 65%)" stopOpacity={0.45}/>
                    <stop offset="100%" stopColor="hsl(262, 80%, 65%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 500 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} dy={15} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} dx={-5} />
                <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                <Legend wrapperStyle={{ paddingTop: "25px" }} iconType="circle" iconSize={12} />
                <Area type="monotone" dataKey="cumulativeRevenue" name="Acumulado" fill="url(#cumulativeGradientFS)" stroke="hsl(262, 80%, 65%)" strokeWidth={4} dot={{ fill: 'hsl(262, 80%, 65%)', strokeWidth: 2, r: 6, stroke: 'hsl(var(--background))' }} activeDot={{ r: 10, fill: 'hsl(262, 80%, 65%)', stroke: 'hsl(var(--background))', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </FullscreenChartDialog>
      </main>
    </div>
  );
};

export default MRR;
