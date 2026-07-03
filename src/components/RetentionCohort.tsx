import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseUtils";
import { yearMonthKeyBrasilia } from "@/lib/dateUtils";

interface CohortData {
  month: string;
  totalCustomers: number;
  retention: { [monthOffset: number]: number };
}

export function RetentionCohort() {
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCohorts() {
      try {
        const auths = await fetchAllRows("authentications", "customer_id, requester_name, date", (q) =>
          q.order("date", { ascending: true })
        );
        
        if (!auths || auths.length === 0) return;

        // Group by customer (using customer_id or requester_name)
        const customerFirstSeen = new Map<string, string>(); // customer key -> first month (YYYY-MM)
        const customerActivity = new Map<string, Set<string>>(); // customer key -> set of months active

        auths.forEach(auth => {
          const key = auth.customer_id || auth.requester_name;
          if (!key) return;
          
          const ym = yearMonthKeyBrasilia(auth.date);
          
          if (!customerFirstSeen.has(key)) {
            customerFirstSeen.set(key, ym);
          }
          
          if (!customerActivity.has(key)) {
            customerActivity.set(key, new Set());
          }
          customerActivity.get(key)!.add(ym);
        });

        // Group into cohorts by YYYY-MM
        const cohortMap = new Map<string, { total: number, activeByMonth: Map<string, number> }>();
        
        customerFirstSeen.forEach((firstMonth, customer) => {
          if (!cohortMap.has(firstMonth)) {
            cohortMap.set(firstMonth, { total: 0, activeByMonth: new Map() });
          }
          const cohort = cohortMap.get(firstMonth)!;
          cohort.total++;
          
          // For each month the customer was active, increment the cohort's active count for that month
          customerActivity.get(customer)?.forEach(activeMonth => {
             const currentCount = cohort.activeByMonth.get(activeMonth) || 0;
             cohort.activeByMonth.set(activeMonth, currentCount + 1);
          });
        });

        // Format to array and calculate month offsets
        const sortedMonths = Array.from(cohortMap.keys()).sort();
        
        // Take last 6 months to avoid overflowing the table
        const recentMonths = sortedMonths.slice(-6);

        const result: CohortData[] = recentMonths.map(month => {
          const cohort = cohortMap.get(month)!;
          const retention: { [offset: number]: number } = {};
          
          // Calculate offset months based on the sorted list
          recentMonths.forEach((targetMonth, index) => {
             if (targetMonth >= month) {
               const startIndex = sortedMonths.indexOf(month);
               const targetIndex = sortedMonths.indexOf(targetMonth);
               const offset = targetIndex - startIndex;
               
               const activeCount = cohort.activeByMonth.get(targetMonth) || 0;
               retention[offset] = Math.round((activeCount / cohort.total) * 100);
             }
          });

          return {
            month,
            totalCustomers: cohort.total,
            retention
          };
        });

        setCohorts(result);
      } catch (error) {
        console.error("Error fetching cohort data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCohorts();
  }, []);

  if (loading) {
    return (
      <Card className="border-border bg-card/50 h-[300px] flex items-center justify-center">
        <span className="text-muted-foreground">Carregando análise de retenção...</span>
      </Card>
    );
  }

  const formatMonth = (ym: string) => {
    const [year, month] = ym.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace('.', '');
  };

  return (
    <Card className="border-border bg-card/50">
      <CardHeader>
        <CardTitle className="font-serif text-xl font-medium tracking-tight">Análise de Safras (Cohorts de Retenção)</CardTitle>
        <CardDescription>Percentual de clientes que continuaram autenticando nos meses seguintes após a 1ª compra.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-medium p-3 text-muted-foreground">Mês da 1ª Compra</th>
                <th className="text-center font-medium p-3 text-muted-foreground">Novos Clientes</th>
                <th className="text-center font-medium p-3 text-muted-foreground">Mês 0</th>
                <th className="text-center font-medium p-3 text-muted-foreground">Mês 1</th>
                <th className="text-center font-medium p-3 text-muted-foreground">Mês 2</th>
                <th className="text-center font-medium p-3 text-muted-foreground">Mês 3</th>
                <th className="text-center font-medium p-3 text-muted-foreground">Mês 4</th>
                <th className="text-center font-medium p-3 text-muted-foreground">Mês 5</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort, index) => (
                <tr key={cohort.month} className="border-b border-border/50">
                  <td className="p-3 font-medium">{formatMonth(cohort.month).toUpperCase()}</td>
                  <td className="p-3 text-center">{cohort.totalCustomers}</td>
                  {[0, 1, 2, 3, 4, 5].map(offset => {
                    const ret = cohort.retention[offset];
                    if (ret === undefined) return <td key={offset} className="p-3 bg-muted/20"></td>;
                    
                    // Heatmap colors based on retention percentage (excluding month 0 as it's always 100%)
                    let bgColor = "transparent";
                    if (offset > 0) {
                      if (ret > 50) bgColor = "bg-primary/40";
                      else if (ret > 30) bgColor = "bg-primary/20";
                      else if (ret > 15) bgColor = "bg-primary/10";
                      else if (ret > 0) bgColor = "bg-primary/5";
                    }

                    return (
                      <td key={offset} className={`p-3 text-center ${bgColor}`}>
                        <span className={offset === 0 ? "text-muted-foreground" : "font-medium"}>
                          {ret}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {cohorts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Dados insuficientes para análise de cohort.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
