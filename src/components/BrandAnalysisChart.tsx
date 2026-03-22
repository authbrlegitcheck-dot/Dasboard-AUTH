import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface BrandStats {
  brand: string;
  total: number;
  authentic: number;
  fake: number;
  inconclusive: number;
}

export function BrandAnalysisChart() {
  const [data, setData] = useState<BrandStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: auths } = await supabase.from("authentications").select("brand, result");

        const brandMap = new Map<string, BrandStats>();

        auths?.forEach((auth) => {
          let b = auth.brand?.trim() || "Não Especificada";
          if (b === "") b = "Não Especificada";

          if (!brandMap.has(b)) {
            brandMap.set(b, { brand: b, total: 0, authentic: 0, fake: 0, inconclusive: 0 });
          }

          const stats = brandMap.get(b)!;
          stats.total += 1;

          const res = auth.result?.toLowerCase() || "";
          if (res.includes("falso") || res.includes("falsa") || res.includes("fake")) {
            stats.fake += 1;
          } else if (res.includes("autêntico") || res.includes("autentico") || res.includes("authentic") || res.includes("verdadeiro")) {
            stats.authentic += 1;
          } else {
            stats.inconclusive += 1;
          }
        });

        // Sort by total volume and take top 10
        const topBrands = Array.from(brandMap.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        setData(topBrands);
      } catch (error) {
        console.error("Error fetching brand data:", error);
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
              <span className="font-mono">{entry.value}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
            Total: {payload[0]?.payload.total} itens
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <Card className="h-[400px] flex items-center justify-center border-border bg-card/50"><span className="text-muted-foreground">Carregando Marcas...</span></Card>;
  }

  return (
    <Card className="border-border bg-card/50">
      <CardHeader>
        <CardTitle className="font-serif text-xl font-medium tracking-tight">Análise de Marcas (Top 10)</CardTitle>
        <p className="text-sm text-muted-foreground">Volume total e proporção de itens autênticos vs falsos</p>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} opacity={0.3} />
              <XAxis 
                type="number" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                dataKey="brand"
                type="category" 
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted)/0.4)'}} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              <Bar dataKey="authentic" name="Autênticos" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} maxBarSize={30} />
              <Bar dataKey="fake" name="Falsos" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} maxBarSize={30} />
              <Bar dataKey="inconclusive" name="Inconclusivos" stackId="a" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
