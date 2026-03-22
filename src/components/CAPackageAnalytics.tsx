import { Card } from "@/components/ui/card";
import MetricCard from "@/components/MetricCard";
import { FullscreenChartDialog, ExpandChartButton } from "@/components/FullscreenChartDialog";
import { Package, TrendingUp, Percent, DollarSign, BarChart3, Sparkles } from "lucide-react";
import { currentMonthBrasilia, yearMonthKeyBrasilia } from "@/lib/dateUtils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  RadialBarChart,
  RadialBar,
  Sector,
} from "recharts";
import { useState, useCallback } from "react";

interface CAPurchase {
  id: string;
  customer_id: string;
  package_id: string;
  credits_purchased: number;
  price_paid: number;
  purchase_date: string;
  status: string;
  ca_packages?: {
    name: string;
    credits: number;
    price: number;
  };
}

interface MonthlyCAData {
  month: string;
  monthKey: string;
  packagesSold: number;
  caRevenue: number;
  totalRevenue: number;
  caPercentage: number;
  creditsSold: number;
}

interface PackageTypeData {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
  fill: string;
}

interface CAPackageAnalyticsProps {
  caPurchases: CAPurchase[];
  monthlyData: { month: string; totalRevenue: number }[];
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={14} fontWeight="bold">
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12}>
        {`${value} vendas`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
        opacity={0.4}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
      <circle cx={ex} cy={ey} r={4} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" fontSize={13} fontWeight="600">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

const CAPackageAnalytics = ({ caPurchases, monthlyData }: CAPackageAnalyticsProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  // Process CA data by month
  const monthlyCAMap = new Map<string, MonthlyCAData>();
  
  caPurchases.forEach((purchase) => {
    const monthKey = yearMonthKeyBrasilia(purchase.purchase_date);
    const [yy, mm] = monthKey.split("-").map(Number);
    const monthLabel = new Date(yy, mm - 1, 1).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
    
    if (!monthlyCAMap.has(monthKey)) {
      monthlyCAMap.set(monthKey, {
        month: monthLabel,
        monthKey,
        packagesSold: 0,
        caRevenue: 0,
        totalRevenue: 0,
        caPercentage: 0,
        creditsSold: 0,
      });
    }
    
    const data = monthlyCAMap.get(monthKey)!;
    data.packagesSold += 1;
    data.caRevenue += Number(purchase.price_paid);
    data.creditsSold += purchase.credits_purchased;
  });

  // Match with total revenue from monthly data
  monthlyData.forEach((mData) => {
    const monthLabel = mData.month;
    monthlyCAMap.forEach((caData) => {
      if (caData.month === monthLabel) {
        caData.totalRevenue = mData.totalRevenue;
        caData.caPercentage = caData.totalRevenue > 0 
          ? (caData.caRevenue / caData.totalRevenue) * 100 
          : 0;
      }
    });
  });

  const sortedMonthlyCA = Array.from(monthlyCAMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, data]) => data);

  // Process package type distribution
  const packageTypeMap = new Map<string, PackageTypeData>();
  
  caPurchases.forEach((purchase) => {
    const packageName = purchase.ca_packages?.name || `${purchase.credits_purchased} CA`;
    
    if (!packageTypeMap.has(packageName)) {
      packageTypeMap.set(packageName, {
        name: packageName,
        count: 0,
        revenue: 0,
        percentage: 0,
        fill: COLORS[packageTypeMap.size % COLORS.length],
      });
    }
    
    const data = packageTypeMap.get(packageName)!;
    data.count += 1;
    data.revenue += Number(purchase.price_paid);
  });

  const totalPackagesSold = caPurchases.length;
  const packageTypeData = Array.from(packageTypeMap.values()).map((data, index) => ({
    ...data,
    percentage: totalPackagesSold > 0 ? (data.count / totalPackagesSold) * 100 : 0,
    fill: COLORS[index % COLORS.length],
  }));

  // Calculate metrics
  const currentMonth = currentMonthBrasilia();
  const currentMonthCA = sortedMonthlyCA.find(d => d.monthKey === currentMonth);
  
  const totalCARevenue = caPurchases.reduce((sum, p) => sum + Number(p.price_paid), 0);
  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.totalRevenue, 0);
  const overallCAPercentage = totalRevenue > 0 ? (totalCARevenue / totalRevenue) * 100 : 0;
  
  const avgPackagesPerMonth = sortedMonthlyCA.length > 0 
    ? totalPackagesSold / sortedMonthlyCA.length 
    : 0;

  const avgTicketCA = totalPackagesSold > 0 
    ? totalCARevenue / totalPackagesSold 
    : 0;

  // Radial data for gauge
  const radialData = [
    { name: "CA", value: overallCAPercentage, fill: "hsl(var(--chart-3))" },
  ];

  const chartConfig = {
    packagesSold: {
      label: "Pacotes Vendidos",
      color: "hsl(var(--chart-1))",
    },
    caRevenue: {
      label: "Receita CA",
      color: "hsl(var(--chart-2))",
    },
    caPercentage: {
      label: "% da Receita",
      color: "hsl(var(--chart-3))",
    },
    creditsSold: {
      label: "Créditos Vendidos",
      color: "hsl(var(--chart-4))",
    },
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Section Header */}
      <div className="border-t border-border/50 pt-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-muted border border-border">
            <Sparkles className="h-6 w-6 text-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">Análise de Pacotes CA</h3>
        </div>
        <p className="text-muted-foreground ml-14">Métricas detalhadas sobre vendas de Créditos AUTH</p>
      </div>

      {/* CA Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Pacotes vendidos (mês)"
          value={currentMonthCA?.packagesSold.toString() || "0"}
          subtitle="Mês atual (Brasília), igual ao agrupamento do MRR"
          icon={Package}
          accent="volume"
        />
        <MetricCard
          title="Receita CA (mês)"
          value={`R$ ${(currentMonthCA?.caRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Soma de price_paid no mês"
          icon={DollarSign}
          accent="revenue"
        />
        <MetricCard
          title="% receita via CA"
          value={`${overallCAPercentage.toFixed(1)}%`}
          subtitle="Receita CA ÷ soma das receitas mensais de autenticações"
          icon={Percent}
          accent="insight"
        />
        <MetricCard
          title="Ticket médio CA"
          value={`R$ ${avgTicketCA.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Receita CA ÷ nº de pacotes vendidos"
          icon={TrendingUp}
          accent="neutral"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total pacotes vendidos"
          value={totalPackagesSold.toString()}
          subtitle="Histórico completo"
          icon={Package}
          accent="neutral"
        />
        <MetricCard
          title="Receita total CA"
          value={`R$ ${totalCARevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Soma de todas as vendas de pacotes"
          icon={DollarSign}
          accent="revenue"
        />
        <MetricCard
          title="Média mensal"
          value={avgPackagesPerMonth.toFixed(1)}
          subtitle="Pacotes ÷ meses com pelo menos uma venda CA"
          icon={BarChart3}
          accent="insight"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Packages Sold per Month - Enhanced */}
        <Card className="p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-foreground">Pacotes Vendidos por Mês</h4>
                <p className="text-sm text-muted-foreground">Evolução das vendas de pacotes CA</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{totalPackagesSold}</p>
                <p className="text-xs text-muted-foreground">total</p>
              </div>
              <ExpandChartButton onClick={() => setFullscreenChart('packages-sold')} />
            </div>
          </div>
          <ChartContainer config={chartConfig} className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sortedMonthlyCA} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="packagesBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="packagesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="glow1">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  dy={10}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                    padding: "12px 16px"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="packagesSold"
                  fill="url(#packagesAreaGradient)"
                  stroke="none"
                />
                <Bar 
                  dataKey="packagesSold" 
                  name="Pacotes"
                  fill="url(#packagesBarGradient)" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
                <Line 
                  type="monotone"
                  dataKey="packagesSold" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                  opacity={0.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>

        {/* CA Revenue per Month - Enhanced */}
        <Card className="p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted border border-border">
                <DollarSign className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-foreground">Receita CA por Mês</h4>
                <p className="text-sm text-muted-foreground">Faturamento mensal via pacotes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">R$ {(totalCARevenue / 1000).toFixed(1)}k</p>
                <p className="text-xs text-muted-foreground">total</p>
              </div>
              <ExpandChartButton onClick={() => setFullscreenChart('ca-revenue')} />
            </div>
          </div>
          <ChartContainer config={chartConfig} className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sortedMonthlyCA} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="caRevenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5}/>
                    <stop offset="50%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="glow2">
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
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  dy={10}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  cursor={{ stroke: 'hsl(var(--chart-2))', strokeWidth: 1, strokeDasharray: '5 5' }}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                    padding: "12px 16px"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="caRevenue"
                  name="Receita CA"
                  fill="url(#caRevenueAreaGradient)"
                  stroke="none"
                />
                <Line 
                  type="monotone"
                  dataKey="caRevenue" 
                  name="Receita CA"
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={4}
                  dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 3, r: 5, stroke: 'hsl(var(--background))' }}
                  activeDot={{ r: 8, fill: 'hsl(var(--chart-2))', stroke: 'hsl(var(--background))', strokeWidth: 4, filter: 'url(#glow2)' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>

        {/* CA Revenue Percentage - Enhanced */}
        <Card className="p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted border border-border">
                <Percent className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-foreground">% da Receita via CA</h4>
                <p className="text-sm text-muted-foreground">Proporção mensal do faturamento</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{overallCAPercentage.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">média geral</p>
              </div>
              <ExpandChartButton onClick={() => setFullscreenChart('ca-percentage')} />
            </div>
          </div>
          <ChartContainer config={chartConfig} className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sortedMonthlyCA} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="percentAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  dy={10}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'auto']}
                  width={40}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  cursor={{ stroke: 'hsl(var(--chart-3))', strokeWidth: 1, strokeDasharray: '5 5' }}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                    padding: "12px 16px"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="caPercentage"
                  fill="url(#percentAreaGradient)"
                  stroke="none"
                />
                <Line 
                  type="monotone"
                  dataKey="caPercentage" 
                  name="% da Receita"
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={4}
                  dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 3, r: 5, stroke: 'hsl(var(--background))' }}
                  activeDot={{ r: 8, fill: 'hsl(var(--chart-3))', stroke: 'hsl(var(--background))', strokeWidth: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>

        {/* Package Type Distribution - Interactive Pie */}
        <Card className="p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-chart-4/20 to-chart-4/5 border border-chart-4/20">
                <BarChart3 className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-foreground">Distribuição por Tipo</h4>
                <p className="text-sm text-muted-foreground">Popularidade de cada pacote</p>
              </div>
            </div>
            <ExpandChartButton onClick={() => setFullscreenChart('package-distribution')} />
          </div>
          <ChartContainer config={chartConfig} className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <linearGradient key={`pieGradient${index}`} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1}/>
                      <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={packageTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="name"
                  onMouseEnter={onPieEnter}
                  style={{ cursor: 'pointer' }}
                >
                  {packageTypeData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#pieGradient${index % COLORS.length})`}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      </div>

      {/* Credits Sold Over Time - Full Width Enhanced */}
      <Card className="p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-to-br from-card via-card to-card/90">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-chart-4/20 to-chart-4/5 border border-chart-4/20">
              <TrendingUp className="h-6 w-6 text-chart-4" />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-foreground">Créditos Vendidos por Mês</h4>
              <p className="text-sm text-muted-foreground">Volume total de CA comercializados</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right bg-chart-4/10 rounded-xl px-5 py-3 border border-chart-4/20">
              <p className="text-sm text-muted-foreground">Total de Créditos</p>
              <p className="text-3xl font-bold text-chart-4">
                {caPurchases.reduce((sum, p) => sum + p.credits_purchased, 0).toLocaleString('pt-BR')} CA
              </p>
            </div>
            <ExpandChartButton onClick={() => setFullscreenChart('credits-sold')} />
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sortedMonthlyCA} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <defs>
                <linearGradient id="creditsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="hsl(var(--chart-4))" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="creditsBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={1}/>
                  <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.5}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                dy={15}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => `${value} CA`}
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
                iconSize={12}
              />
              <Area
                type="monotone"
                dataKey="creditsSold"
                name="Créditos Vendidos"
                fill="url(#creditsAreaGradient)"
                stroke="none"
              />
              <Bar
                dataKey="creditsSold"
                name="Créditos Vendidos"
                fill="url(#creditsBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
              <Line 
                type="monotone"
                dataKey="creditsSold" 
                stroke="hsl(var(--chart-4))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--chart-4))', strokeWidth: 3, r: 5, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 8, fill: 'hsl(var(--chart-4))', stroke: 'hsl(var(--background))', strokeWidth: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </Card>

      {/* Fullscreen Chart Dialogs */}
      <FullscreenChartDialog
        open={fullscreenChart === 'packages-sold'}
        onOpenChange={(open) => !open && setFullscreenChart(null)}
        title="Pacotes Vendidos por Mês"
        subtitle="Evolução das vendas de pacotes CA"
        icon={<Package className="h-5 w-5 text-primary" />}
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sortedMonthlyCA} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <defs>
                <linearGradient id="packagesBarGradientFS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="packagesAreaGradientFS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                dy={15}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ paddingTop: "25px" }} iconType="circle" iconSize={12} />
              <Area type="monotone" dataKey="packagesSold" fill="url(#packagesAreaGradientFS)" stroke="none" />
              <Bar dataKey="packagesSold" name="Pacotes" fill="url(#packagesBarGradientFS)" radius={[6, 6, 0, 0]} maxBarSize={55} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </FullscreenChartDialog>

      <FullscreenChartDialog
        open={fullscreenChart === 'ca-revenue'}
        onOpenChange={(open) => !open && setFullscreenChart(null)}
        title="Receita CA por Mês"
        subtitle="Faturamento mensal via pacotes"
        icon={<DollarSign className="h-5 w-5 text-foreground" />}
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sortedMonthlyCA} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <defs>
                <linearGradient id="caRevenueAreaGradientFS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                dy={15}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend wrapperStyle={{ paddingTop: "25px" }} iconType="circle" iconSize={12} />
              <Area type="monotone" dataKey="caRevenue" name="Receita CA" fill="url(#caRevenueAreaGradientFS)" stroke="none" />
              <Line 
                type="monotone"
                dataKey="caRevenue" 
                name="Receita CA"
                stroke="hsl(var(--chart-2))" 
                strokeWidth={4}
                dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 3, r: 6, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 10, fill: 'hsl(var(--chart-2))', stroke: 'hsl(var(--background))', strokeWidth: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </FullscreenChartDialog>

      <FullscreenChartDialog
        open={fullscreenChart === 'ca-percentage'}
        onOpenChange={(open) => !open && setFullscreenChart(null)}
        title="% da Receita via CA"
        subtitle="Proporção mensal do faturamento"
        icon={<Percent className="h-5 w-5 text-foreground" />}
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sortedMonthlyCA} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <defs>
                <linearGradient id="percentAreaGradientFS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                dy={15}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
              <Legend wrapperStyle={{ paddingTop: "25px" }} iconType="circle" iconSize={12} />
              <Area type="monotone" dataKey="caPercentage" fill="url(#percentAreaGradientFS)" stroke="none" />
              <Line 
                type="monotone"
                dataKey="caPercentage" 
                name="% da Receita"
                stroke="hsl(var(--chart-3))" 
                strokeWidth={4}
                dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 3, r: 6, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 10, fill: 'hsl(var(--chart-3))', stroke: 'hsl(var(--background))', strokeWidth: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </FullscreenChartDialog>

      <FullscreenChartDialog
        open={fullscreenChart === 'package-distribution'}
        onOpenChange={(open) => !open && setFullscreenChart(null)}
        title="Distribuição por Tipo de Pacote"
        subtitle="Popularidade de cada pacote"
        icon={<BarChart3 className="h-5 w-5 text-chart-4" />}
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {COLORS.map((color, index) => (
                  <linearGradient key={`pieGradientFS${index}`} id={`pieGradientFS${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                  </linearGradient>
                ))}
              </defs>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={packageTypeData}
                cx="50%"
                cy="50%"
                innerRadius={100}
                outerRadius={160}
                paddingAngle={3}
                dataKey="count"
                nameKey="name"
                onMouseEnter={onPieEnter}
                style={{ cursor: 'pointer' }}
              >
                {packageTypeData.map((_, index) => (
                  <Cell 
                    key={`cell-fs-${index}`} 
                    fill={`url(#pieGradientFS${index % COLORS.length})`}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Legend 
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ paddingLeft: "30px" }}
                formatter={(value) => <span className="text-sm font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </FullscreenChartDialog>

      <FullscreenChartDialog
        open={fullscreenChart === 'credits-sold'}
        onOpenChange={(open) => !open && setFullscreenChart(null)}
        title="Créditos Vendidos por Mês"
        subtitle="Volume total de CA comercializados"
        icon={<TrendingUp className="h-5 w-5 text-chart-4" />}
      >
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sortedMonthlyCA} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <defs>
                <linearGradient id="creditsAreaGradientFS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="creditsBarGradientFS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={1}/>
                  <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.5}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                dy={15}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => `${value.toLocaleString('pt-BR')} CA`}
              />
              <Legend wrapperStyle={{ paddingTop: "25px" }} iconType="circle" iconSize={12} />
              <Area type="monotone" dataKey="creditsSold" name="Créditos" fill="url(#creditsAreaGradientFS)" stroke="none" />
              <Bar dataKey="creditsSold" name="Créditos Vendidos" fill="url(#creditsBarGradientFS)" radius={[6, 6, 0, 0]} maxBarSize={55} />
              <Line 
                type="monotone"
                dataKey="creditsSold" 
                stroke="hsl(var(--chart-4))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--chart-4))', strokeWidth: 3, r: 6, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 10, fill: 'hsl(var(--chart-4))', stroke: 'hsl(var(--background))', strokeWidth: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </FullscreenChartDialog>
    </div>
  );
};

export default CAPackageAnalytics;
