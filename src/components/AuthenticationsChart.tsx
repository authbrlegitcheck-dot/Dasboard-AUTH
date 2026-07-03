import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, ComposedChart } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { nowBrasilia } from "@/lib/dateUtils";

export const AuthenticationsChart = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["authentications-chart"],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(startOfMonth(nowBrasilia()), 5);
      const cutoff = sixMonthsAgo.toISOString();
      
      const data = await fetchAllRows("authentications", "date, price", (q) =>
        q.gte("date", cutoff).order("date")
      );

      // Agrupa por mês
      const monthlyData = data?.reduce((acc: any[], auth: any) => {
        const monthKey = format(new Date(auth.date), "MMM/yy", { locale: ptBR });
        const existing = acc.find(item => item.month === monthKey);
        
        if (existing) {
          existing.count += 1;
          existing.revenue += Number(auth.price);
        } else {
          acc.push({
            month: monthKey,
            count: 1,
            revenue: Number(auth.price)
          });
        }
        return acc;
      }, []) || [];

      return monthlyData;
    }
  });

  const totalAuths = chartData?.reduce((sum, item) => sum + item.count, 0) || 0;
  const avgAuths = chartData && chartData.length > 0 ? Math.round(totalAuths / chartData.length) : 0;

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Autenticações nos Últimos 6 Meses</CardTitle>
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
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Autenticações nos Últimos 6 Meses</CardTitle>
              <CardDescription>Tendência de volume de autenticações</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{totalAuths}</p>
            <p className="text-xs text-muted-foreground">Total | Média: {avgAuths}/mês</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorAuthCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
              itemStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="transparent"
              fill="url(#colorAuthCount)"
              name="Área"
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              name="Autenticações"
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 5 }}
              activeDot={{ r: 8, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
