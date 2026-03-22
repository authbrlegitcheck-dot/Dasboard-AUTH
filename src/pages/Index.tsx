import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardHeader from "@/components/DashboardHeader";
import MetricCard from "@/components/MetricCard";
import GoalsChecklist from "@/components/GoalsChecklist";
import MonthlyGoalProgress from "@/components/MonthlyGoalProgress";
import { AuthenticationsChart } from "@/components/AuthenticationsChart";
import { ResultsDistributionChart } from "@/components/ResultsDistributionChart";
import { CategoryDistributionChart } from "@/components/CategoryDistributionChart";
import { RevenueChart } from "@/components/RevenueChart";
import { FinancialDRE } from "@/components/FinancialDRE";
import { BrandAnalysisChart } from "@/components/BrandAnalysisChart";
import {
  ShieldCheck,
  TrendingUp,
  Calendar,
  DollarSign,
  Activity,
  Wallet,
  Receipt,
  BarChart3,
  ShoppingCart,
  Plus,
} from "lucide-react";
import {
  currentMonthBrasilia,
  formatDateBrasilia,
  dateKeyBrasilia,
  yearMonthKeyBrasilia,
  prevYearMonthKey,
  daysInMonth,
} from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
function formatCompactBRL(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)} mi`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    growthAuth: 0,
    growthRevenue: 0,
    dailyAvg: 0,
    monthlyAvg: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    avgTicketRegular: 0,
    avgTicketPartner: 0,
    avgTicketOperacional: 0,
    avgTicketComercial: 0,
  });

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        navigate("/auth");
        return;
      }

      fetchMetrics();
    } catch (e) {
      console.error("Error in checkAuthAndFetchData:", e);
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const { data: authentications, error } = await supabase.from("authentications").select("*");

      if (error) throw error;

      const total = authentications?.length || 0;
      const totalRevenue = authentications?.reduce((sum, auth) => sum + Number(auth.price), 0) || 0;

      const todayStr = formatDateBrasilia(new Date(), "yyyy-MM-dd");
      const currentYM = currentMonthBrasilia();

      const monthlyBuckets = new Map<string, number>();
      authentications?.forEach((auth) => {
        const ym = yearMonthKeyBrasilia(auth.date);
        monthlyBuckets.set(ym, (monthlyBuckets.get(ym) || 0) + 1);
      });
      const monthlyAvg = monthlyBuckets.size > 0 ? total / monthlyBuckets.size : 0;

      const monthlyRevenue =
        authentications
          ?.filter((auth) => yearMonthKeyBrasilia(auth.date) === currentYM)
          .reduce((sum, auth) => sum + Number(auth.price), 0) || 0;

      const [ty, tm, td] = todayStr.split("-").map(Number);
      const cutoffCal = new Date(ty, tm - 1, td);
      cutoffCal.setDate(cutoffCal.getDate() - 29);
      const cutoffStr = `${cutoffCal.getFullYear()}-${String(cutoffCal.getMonth() + 1).padStart(2, "0")}-${String(cutoffCal.getDate()).padStart(2, "0")}`;

      const recentAuths =
        authentications?.filter((auth) => {
          const dk = dateKeyBrasilia(auth.date);
          return dk >= cutoffStr && dk <= todayStr;
        }).length || 0;
      const dailyAvg = recentAuths / 30;

      const currentDay = parseInt(todayStr.slice(8, 10), 10);

      const mtdSlice = (ym: string, maxDayInclusive: number) => {
        const [y, m] = ym.split("-").map(Number);
        const dim = daysInMonth(y, m);
        const endDay = Math.min(maxDayInclusive, dim);
        const start = `${ym}-01`;
        const end = `${ym}-${String(endDay).padStart(2, "0")}`;
        return (
          authentications?.filter((auth) => {
            const dk = dateKeyBrasilia(auth.date);
            return dk >= start && dk <= end;
          }) || []
        );
      };

      const currentMTD = mtdSlice(currentYM, currentDay);
      const prevYM = prevYearMonthKey(currentYM);
      const prevMTD = mtdSlice(prevYM, currentDay);

      const currentMTDAuthCount = currentMTD.length;
      const prevMTDAuthCount = prevMTD.length;
      const growthAuth =
        prevMTDAuthCount > 0
          ? ((currentMTDAuthCount - prevMTDAuthCount) / prevMTDAuthCount) * 100
          : currentMTDAuthCount > 0
            ? 100
            : 0;

      const currentMTDRevenue = currentMTD.reduce((sum, auth) => sum + Number(auth.price), 0);
      const prevMTDRevenue = prevMTD.reduce((sum, auth) => sum + Number(auth.price), 0);
      const growthRevenue =
        prevMTDRevenue > 0
          ? ((currentMTDRevenue - prevMTDRevenue) / prevMTDRevenue) * 100
          : currentMTDRevenue > 0
            ? 100
            : 0;

      const regularAuths = authentications?.filter((auth) => !auth.partner_store_id) || [];
      const partnerAuths = authentications?.filter((auth) => auth.partner_store_id) || [];

      const regularAuthsForTicket = regularAuths.filter((auth) => !auth.paid_with_ca);
      const partnerAuthsForTicket = partnerAuths.filter((auth) => !auth.paid_with_ca);

      const regularRevenueForTicket = regularAuthsForTicket.reduce((sum, auth) => sum + Number(auth.price), 0);
      const partnerRevenueForTicket = partnerAuthsForTicket.reduce((sum, auth) => sum + Number(auth.price), 0);

      const avgTicketRegular =
        regularAuthsForTicket.length > 0 ? regularRevenueForTicket / regularAuthsForTicket.length : 0;
      const avgTicketPartner =
        partnerAuthsForTicket.length > 0 ? partnerRevenueForTicket / partnerAuthsForTicket.length : 0;

      const regularTotal = regularAuths.length;
      const regularRevenue = regularAuths.reduce((sum, auth) => sum + Number(auth.price), 0);
      const avgTicketOperacional = regularTotal > 0 ? regularRevenue / regularTotal : 0;

      const { data: caPurchases } = await supabase.from("ca_purchases").select("price_paid");

      const caRevenue = caPurchases?.reduce((sum, p) => sum + Number(p.price_paid), 0) || 0;
      const caCount = caPurchases?.length || 0;

      const avulsasComercial =
        authentications?.filter((auth) => !auth.paid_with_ca && !auth.partner_store_id) || [];
      const avulsasRevenue = avulsasComercial.reduce((sum, auth) => sum + Number(auth.price), 0);
      const avulsasCount = avulsasComercial.length;

      const totalComercialRevenue = caRevenue + avulsasRevenue;
      const totalComercialCount = caCount + avulsasCount;
      const avgTicketComercial =
        totalComercialCount > 0 ? totalComercialRevenue / totalComercialCount : 0;

      setMetrics({
        total,
        growthAuth,
        growthRevenue,
        dailyAvg,
        monthlyAvg,
        monthlyRevenue,
        totalRevenue,
        avgTicketRegular,
        avgTicketPartner,
        avgTicketOperacional,
        avgTicketComercial,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-foreground">Visão geral</h2>
          <Button
            onClick={() => navigate("/authentications")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-[0.7rem] uppercase tracking-[0.12em] h-10 px-5"
          >
            <Plus className="mr-2 h-4 w-4" />
            Gerenciar autenticações
          </Button>
        </div>

        <Tabs defaultValue="visao-geral" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 inline-flex w-full overflow-x-auto justify-start sm:w-auto">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="metas">Metas e Equipe</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="space-y-8 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total de autenticações"
                value={metrics.total.toLocaleString("pt-BR")}
                subtitle="Desde o início"
                icon={ShieldCheck}
                accent="volume"
              />
              <MetricCard
                title="Crescimento (autenticações)"
                value={`${metrics.growthAuth > 0 ? "+" : ""}${metrics.growthAuth.toFixed(1)}%`}
                subtitle="MTD vs. mesmo período no mês anterior (Brasília)"
                icon={TrendingUp}
                accent="insight"
              />
              <MetricCard
                title="Crescimento (receita)"
                value={`${metrics.growthRevenue > 0 ? "+" : ""}${metrics.growthRevenue.toFixed(1)}%`}
                subtitle="MTD vs. mesmo período no mês anterior (Brasília)"
                icon={DollarSign}
                accent="revenue"
              />
              <MetricCard
                title="Média diária"
                value={metrics.dailyAvg.toFixed(1)}
                subtitle="Autenticações por dia (últimos 30 dias, calendário Brasília)"
                icon={Activity}
                accent="neutral"
              />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <AuthenticationsChart />
              <RevenueChart />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MonthlyGoalProgress />
              </div>

              <MetricCard
                title="Faturamento total"
                value={formatCompactBRL(metrics.totalRevenue)}
                subtitle={`R$ ${metrics.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} acumulado`}
                icon={Wallet}
                accent="revenue"
              />
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-8 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Faturamento mensal"
                value={`R$ ${metrics.monthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="Receita do mês atual (Brasília)"
                icon={DollarSign}
                accent="revenue"
              />
              <MetricCard
                title="Ticket médio operacional"
                value={`R$ ${metrics.avgTicketOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="Receita ÷ nº de autenticações comuns (incl. CA)"
                icon={BarChart3}
                accent="revenue"
              />
              <MetricCard
                title="Ticket médio comercial"
                value={`R$ ${metrics.avgTicketComercial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="(Vendas CA + auths avulsas não parceiras) ÷ transações"
                icon={ShoppingCart}
                accent="revenue"
              />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <FinancialDRE />
              <BrandAnalysisChart />
            </div>
          </TabsContent>

          <TabsContent value="operacional" className="space-y-8 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Média mensal"
                value={metrics.monthlyAvg.toFixed(0)}
                subtitle="Média de autenticações por mês com registo"
                icon={Calendar}
                accent="neutral"
              />
              <MetricCard
                title="Ticket médio (AUTH)"
                value={`R$ ${metrics.avgTicketRegular.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="Autenticações comuns, excl. CA e parceiros"
                icon={Receipt}
                accent="neutral"
              />
              <MetricCard
                title="Ticket médio (parceiros)"
                value={`R$ ${metrics.avgTicketPartner.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="Lojas parceiras, excl. pagas com CA"
                icon={Receipt}
                accent="neutral"
              />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <ResultsDistributionChart />
              <CategoryDistributionChart />
            </div>
          </TabsContent>

          <TabsContent value="metas" className="space-y-8 mt-4">
            <div className="max-w-2xl">
              <GoalsChecklist />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
