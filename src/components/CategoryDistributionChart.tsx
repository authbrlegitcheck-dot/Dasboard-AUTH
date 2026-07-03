import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Tag } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--success))",
  "hsl(var(--destructive))"
];

export const CategoryDistributionChart = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["category-distribution"],
    queryFn: async () => {
      const data = await fetchAllRows("authentications", "item_category");

      const categories = data?.reduce((acc: any[], item: any) => {
        const categoryMap: any = {
          "roupa": "Roupas",
          "tenis_calcados": "Tênis/Calçados",
          "personalizado": "Personalizado"
        };
        
        const categoryName = categoryMap[item.item_category] || item.item_category;
        const existing = acc.find(c => c.category === categoryName);
        
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ category: categoryName, count: 1 });
        }
        return acc;
      }, []) || [];

      // Sort by count descending
      return categories.sort((a, b) => b.count - a.count);
    }
  });

  const total = chartData?.reduce((sum, item) => sum + item.count, 0) || 0;
  const topCategory = chartData && chartData.length > 0 ? chartData[0]?.category : "-";

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Tag className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
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
            <div className="p-2 rounded-lg bg-muted">
              <Tag className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Distribuição por Categoria</CardTitle>
              <CardDescription>Volume de autenticações por tipo de item</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">{topCategory}</p>
            <p className="text-xs text-muted-foreground">Categoria mais popular</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={true} vertical={false} />
            <XAxis 
              type="number"
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis 
              type="category"
              dataKey="category"
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={120}
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
              formatter={(value: number) => [value, "Quantidade"]}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            <Bar 
              dataKey="count" 
              name="Quantidade"
              radius={[0, 8, 8, 0]}
              barSize={40}
            >
              {chartData?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList 
                dataKey="count" 
                position="right" 
                fill="hsl(var(--foreground))"
                fontSize={14}
                fontWeight={600}
                formatter={(value: number) => `${value} (${((value / total) * 100).toFixed(0)}%)`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
