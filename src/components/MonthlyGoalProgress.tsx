import { Card } from "@/components/ui/card";
import { Target, TrendingUp, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseUtils";
import { nowBrasilia, currentMonthBrasilia } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const MonthlyGoalProgress = () => {
  const [currentAuthentications, setCurrentAuthentications] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const now = nowBrasilia();
      const currentMonth = currentMonthBrasilia();
      const currentMonthDate = `${currentMonth}-01`;

      // Calculate next month's first day for the date range
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      // Fetch current month authentications (with pagination)
      const authData = await fetchAllRows("authentications", "id", (q) =>
        q.gte("date", `${currentMonth}-01`).lt("date", nextMonthDate)
      );

      setCurrentAuthentications(authData?.length || 0);

      // Fetch monthly target
      const { data: targetData, error: targetError } = await supabase
        .from("monthly_targets")
        .select("*")
        .eq("month", currentMonthDate)
        .maybeSingle();

      if (targetError) throw targetError;
      setMonthlyGoal(targetData?.target_authentications || 0);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-glow">
        <div className="p-6 text-center text-muted-foreground">
          Carregando meta mensal...
        </div>
      </Card>
    );
  }

  const progress = monthlyGoal > 0 ? (currentAuthentications / monthlyGoal) * 100 : 0;
  const remaining = monthlyGoal - currentAuthentications;
  const now = nowBrasilia();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const currentDay = now.getDate();
  const daysRemaining = daysInMonth - currentDay;
  const dailyAverage = daysRemaining > 0 ? remaining / daysRemaining : 0;

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-glow">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Meta Mensal</h3>
              <p className="text-sm text-muted-foreground">
                {monthlyGoal > 0
                  ? `${currentAuthentications.toLocaleString(
                      "pt-BR"
                    )} / ${monthlyGoal.toLocaleString("pt-BR")} autenticações`
                  : "Nenhuma meta definida"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/goals")}
            className="border-border"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {monthlyGoal > 0 ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Progresso
                </span>
                <span className="text-sm font-bold text-primary">
                  {progress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-700 relative"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Faltam</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.max(0, remaining)}
                </p>
                <p className="text-xs text-muted-foreground">autenticações</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Média necessária
                </p>
                <p className="text-2xl font-bold text-primary flex items-center gap-1">
                  {Math.ceil(Math.max(0, dailyAverage))}
                  <TrendingUp className="h-4 w-4" />
                </p>
                <p className="text-xs text-muted-foreground">por dia</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Nenhuma meta mensal definida
            </p>
            <Button
              onClick={() => navigate("/goals")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Definir Meta
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MonthlyGoalProgress;
