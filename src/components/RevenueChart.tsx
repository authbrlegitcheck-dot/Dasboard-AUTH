import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign } from "lucide-react";
import { nowBrasilia } from "@/lib/dateUtils";

export const RevenueChart = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(startOfMonth(nowBrasilia()), 5);
      const cutoff = sixMonthsAgo.toISOString();
      
      const data = await fetchAllRows("authentications", "date, price", (q) =>
        q.gte("date", cutoff).order("date")
      );

      const monthlyData = data?.reduce((acc: any[], auth: any) => {
        const monthKey = format(new Date(auth.date), "MMM/yy", { locale: ptBR });
        const existing = acc.find(item => item.month === monthKey);
        
        if (existing) {
          existing.revenue += Number(auth.price);
        } else {
          acc.push({
            month: monthKey,
            revenue: Number(auth.price)
          });
        }
        return acc;
      }, []) || [];

      return monthlyData;
    }
  });

  const totalRevenue = chartData?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const avgRevenue = chartData && chartData.length > 0 ? totalRevenue / chartData.length : 0;

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg">Receita nos Últimos 6 Meses</CardTitle>
              <CardDescription>Carregando...</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Receita nos Últimos 6 Meses</CardTitle>
              <CardDescription>Evolução da receita mensal</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success">
              R$ {(totalRevenue / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-muted-foreground">
              Média: R$ {avgRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mês
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4}/>
                <stop offset="50%" stopColor="hsl(var(--success))" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              dy={10}
            />
            <YAxis 
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                padding: "12px 16px"
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold", marginBottom: "8px" }}
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, "Receita"]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--success))" 
              fillOpacity={1} 
              fill="url(#colorRevenueGradient)"
              strokeWidth={3}
              name="Receita"
              dot={{ fill: "hsl(var(--success))", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 8, fill: "hsl(var(--success))", stroke: "hsl(var(--background))", strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
