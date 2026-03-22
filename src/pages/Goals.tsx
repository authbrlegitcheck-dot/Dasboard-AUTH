import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import { nowBrasilia, currentMonthBrasilia, todayBrasiliaISO } from "@/lib/dateUtils";

type WeeklyGoal = {
  id: string;
  goal_text: string;
  completed: boolean;
  week_start: string;
};

type MonthlyTarget = {
  id: string;
  month: string;
  target_authentications: number;
};

const Goals = () => {
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(0);
  const [newGoalText, setNewGoalText] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchData = async () => {
    try {
      // Fetch weekly goals
      const today = nowBrasilia();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const { data: goalsData, error: goalsError } = await supabase
        .from("weekly_goals")
        .select("*")
        .gte("week_start", startOfWeek.toISOString().split("T")[0])
        .order("created_at", { ascending: true });

      if (goalsError) throw goalsError;
      setWeeklyGoals(goalsData || []);

      // Fetch monthly target
      const currentMonth = currentMonthBrasilia();
      const currentMonthDate = `${currentMonth}-01`;

      const { data: targetData, error: targetError } = await supabase
        .from("monthly_targets")
        .select("*")
        .eq("month", currentMonthDate)
        .maybeSingle();

      if (targetError) throw targetError;
      setMonthlyTarget(targetData?.target_authentications || 0);
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

  const addWeeklyGoal = async () => {
    if (!newGoalText.trim()) return;

    try {
      const today = nowBrasilia();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const { error } = await supabase.from("weekly_goals").insert({
        goal_text: newGoalText,
        week_start: startOfWeek.toISOString().split("T")[0],
        completed: false,
      });

      if (error) throw error;

      toast({
        title: "Meta adicionada!",
      });
      setNewGoalText("");
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const deleteWeeklyGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from("weekly_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Meta removida",
      });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const saveMonthlyTarget = async () => {
    try {
      const currentMonth = currentMonthBrasilia();
      const currentMonthDate = `${currentMonth}-01`;

      const { error } = await supabase
        .from("monthly_targets")
        .upsert(
          {
            month: currentMonthDate,
            target_authentications: monthlyTarget,
          },
          {
            onConflict: "month",
          }
        );

      if (error) throw error;

      toast({
        title: "Meta mensal salva!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <DashboardHeader />

      <main className="container mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/")}
            className="border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-serif text-3xl font-medium text-foreground">
            Gerenciar Metas
          </h1>
        </div>

        <div className="grid gap-6 max-w-4xl">
          {/* Monthly Target */}
          <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
            <h2 className="text-xl font-bold mb-4">Meta Mensal</h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="monthly-target">
                  Meta de Autenticações para o Mês
                </Label>
                <Input
                  id="monthly-target"
                  type="number"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                  className="mt-2"
                  placeholder="Ex: 1000"
                />
              </div>
              <Button
                onClick={saveMonthlyTarget}
                className="bg-primary text-primary-foreground hover:bg-primary/90 self-end"
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </div>
          </Card>

          {/* Weekly Goals */}
          <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
            <h2 className="text-xl font-bold mb-4">Metas Semanais</h2>

            <div className="flex gap-4 mb-6">
              <Input
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="Digite uma nova meta semanal..."
                onKeyPress={(e) => e.key === "Enter" && addWeeklyGoal()}
              />
              <Button
                onClick={addWeeklyGoal}
                className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            {loading ? (
              <div className="text-center text-muted-foreground py-8">
                Carregando...
              </div>
            ) : weeklyGoals.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma meta semanal cadastrada ainda
              </div>
            ) : (
              <div className="space-y-2">
                {weeklyGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50"
                  >
                    <span className={goal.completed ? "line-through text-muted-foreground" : ""}>
                      {goal.goal_text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWeeklyGoal(goal.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Goals;
