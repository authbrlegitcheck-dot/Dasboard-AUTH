import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAllRows } from "@/lib/supabaseUtils";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { yearMonthKeyBrasilia } from "@/lib/dateUtils";

interface BrandStats {
  brand: string;
  total: number;
  authentic: number;
  fake: number;
  inconclusive: number;
}

export function BrandAnalysisChart() {
  const [rawAuths, setRawAuths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");

  useEffect(() => {
    async function fetchData() {
      try {
        const auths = await fetchAllRows("authentications", "brand, result, date");
        setRawAuths(auths || []);
      } catch (error) {
        console.error("Error fetching brand data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Compute available months from data
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    rawAuths.forEach((auth) => {
      if (auth.date) {
        monthsSet.add(yearMonthKeyBrasilia(auth.date));
      }
    });
    return Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a)) // Newer months first
      .map((ym) => {
        const [y, m] = ym.split("-").map(Number);
        const date = new Date(y, m - 1, 1);
        const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        return {
          key: ym,
          label: label.charAt(0).toUpperCase() + label.slice(1),
        };
      });
  }, [rawAuths]);

  // Filter raw authentications by selected month
  const filteredAuths = useMemo(() => {
    if (selectedMonth === "all") return rawAuths;
    return rawAuths.filter(
      (auth) => auth.date && yearMonthKeyBrasilia(auth.date) === selectedMonth
    );
  }, [rawAuths, selectedMonth]);

  // Compute brand stats based on filtered authentications
  const brandStats = useMemo(() => {
    const brandMap = new Map<string, BrandStats>();

    filteredAuths.forEach((auth) => {
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
      } else if (
        res.includes("autêntico") ||
        res.includes("autentico") ||
        res.includes("authentic") ||
        res.includes("verdadeiro")
      ) {
        stats.authentic += 1;
      } else {
        stats.inconclusive += 1;
      }
    });

    return Array.from(brandMap.values());
  }, [filteredAuths]);

  // Top 10 brands for the Bar Chart
  const chartData = useMemo(() => {
    return [...brandStats].sort((a, b) => b.total - a.total).slice(0, 10);
  }, [brandStats]);

  // All brands for the table
  const tableData = useMemo(() => {
    return [...brandStats].sort((a, b) => b.total - a.total);
  }, [brandStats]);

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
    return (
      <Card className="h-[450px] flex items-center justify-center border-border bg-card/50">
        <span className="text-muted-foreground">Carregando Marcas...</span>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/50">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <CardTitle className="font-serif text-xl font-medium tracking-tight">Análise de Marcas</CardTitle>
          <p className="text-sm text-muted-foreground">Volume total e proporção de itens autênticos vs falsos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro de Mês */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs bg-background text-foreground border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <option value="all">Todos os meses</option>
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Toggle de Visualização */}
          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-md border border-border">
            <button
              onClick={() => setActiveTab("chart")}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                activeTab === "chart"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Gráfico (Top 10)
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                activeTab === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tabela (Todas)
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "chart" ? (
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />

                <Bar dataKey="authentic" name="Autênticos" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} maxBarSize={30} />
                <Bar dataKey="fake" name="Falsos" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} maxBarSize={30} />
                <Bar dataKey="inconclusive" name="Inconclusivos" stackId="a" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[350px] w-full overflow-y-auto mt-4 pr-1">
            <Table>
              <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead className="w-1/3">Marca</TableHead>
                  <TableHead className="text-right">Autênticos</TableHead>
                  <TableHead className="text-right">Falsos</TableHead>
                  <TableHead className="text-right">Inconclusivos</TableHead>
                  <TableHead className="text-right font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma marca registrada neste período.
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((row) => (
                    <TableRow key={row.brand} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{row.brand}</TableCell>
                      <TableCell className="text-right text-success">{row.authentic}</TableCell>
                      <TableCell className="text-right text-destructive">{row.fake}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.inconclusive}</TableCell>
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
