import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
} from "recharts";

interface MonthlyFinancials {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export function FinancialDRE() {
  const [data, setData] = useState<MonthlyFinancials[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: auths } = await supabase.from("authentications").select("price, date");
        const { data: invs } = await supabase.from("investments").select("amount, date");

        const monthlyMap = new Map<string, MonthlyFinancials>();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i);
          const key = format(d, "yyyy-MM");
          monthlyMap.set(key, { month: key, revenue: 0, expenses: 0, netProfit: 0 });
        }

        // Aggregate Revenue
        auths?.forEach((auth) => {
          const key = auth.date.substring(0, 7);
          if (monthlyMap.has(key)) {
            const current = monthlyMap.get(key)!;
            current.revenue += Number(auth.price) || 0;
            current.netProfit = current.revenue - current.expenses;
          }
        });

        // Aggregate Expenses
        invs?.forEach((inv) => {
          const key = inv.date.substring(0, 7);
          if (monthlyMap.has(key)) {
            const current = monthlyMap.get(key)!;
            current.expenses += Number(inv.amount) || 0;
            current.netProfit = current.revenue - current.expenses;
          }
        });

        // Format for chart
        const formattedData = Array.from(monthlyMap.values()).map((item) => ({
          ...item,
          monthLabel: format(parseISO(`${item.month}-01`), "MMM/yy", { locale: ptBR }).toUpperCase(),
        }));

        setData(formattedData);
      } catch (error) {
        console.error("Error fetching DRE data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-glow">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-mono">
                R$ {entry.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <Card className="h-[400px] flex items-center justify-center border-border bg-card/50"><span className="text-muted-foreground">Carregando DRE...</span></Card>;
  }

  return (
    <Card className="border-border bg-card/50">
      <CardHeader>
        <CardTitle className="font-serif text-xl font-medium tracking-tight">DRE Gerencial (6 meses)</CardTitle>
        <p className="text-sm text-muted-foreground">Receita Bruta vs Despesas Operacionais = Lucro Líquido</p>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$ ${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              
              <Bar dataKey="revenue" name="Receita Bruta" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expenses" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line type="monotone" dataKey="netProfit" name="Lucro Líquido" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
