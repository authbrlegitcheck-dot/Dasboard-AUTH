import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from "recharts";
import { useState, useCallback } from "react";
import { CheckCircle } from "lucide-react";

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="hsl(var(--foreground))" className="text-lg font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-sm">
        {value} ({(percent * 100).toFixed(1)}%)
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 15}
        outerRadius={outerRadius + 20}
        fill={fill}
      />
    </g>
  );
};

export const ResultsDistributionChart = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["results-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authentications")
        .select("result");

      if (error) throw error;

      const auth = data?.filter(item => item.result === "AUTH").length || 0;
      const replica = data?.filter(item => item.result === "RÉPLICA").length || 0;

      return [
        { name: "Autêntico", value: auth, color: "hsl(var(--success))" },
        { name: "Réplica", value: replica, color: "hsl(var(--destructive))" }
      ];
    }
  });

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const total = chartData?.reduce((sum, item) => sum + item.value, 0) || 0;
  const authRate = chartData && total > 0 ? ((chartData[0]?.value || 0) / total * 100).toFixed(1) : 0;

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg">Distribuição de Resultados</CardTitle>
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
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Distribuição de Resultados</CardTitle>
              <CardDescription>Proporção de itens autênticos vs réplicas</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success">{authRate}%</p>
            <p className="text-xs text-muted-foreground">Taxa de autenticidade</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={380}>
          <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={80}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              paddingAngle={3}
            >
              {chartData?.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                padding: "12px 16px"
              }}
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "30px" }}
              iconType="circle"
              iconSize={12}
              formatter={(value) => <span style={{ color: "hsl(var(--foreground))", marginLeft: "8px" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
