import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { nowBrasilia } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Goal {
  id: string;
  goal_text: string;
  completed: boolean;
}

const GoalsChecklist = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const today = nowBrasilia();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const { data, error } = await supabase
        .from("weekly_goals")
        .select("*")
        .gte("week_start", startOfWeek.toISOString().split("T")[0])
        .order("created_at", { ascending: true });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar metas",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleGoal = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    try {
      const { error } = await supabase
        .from("weekly_goals")
        .update({ completed: !goal.completed })
        .eq("id", id);

      if (error) throw error;

      setGoals(
        goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
      );
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar meta",
        description: error.message,
      });
    }
  };

  const completedCount = goals.filter((g) => g.completed).length;
  const progress = goals.length > 0 ? (completedCount / goals.length) * 100 : 0;

  if (loading) {
    return (
      <Card className="transition-all duration-300 hover:shadow-glow">
        <div className="p-6 text-center text-muted-foreground">
          Carregando metas...
        </div>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-glow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-foreground">Metas Semanais</h3>
            <p className="text-sm text-muted-foreground">
              {goals.length > 0
                ? `${completedCount} de ${goals.length} concluídas`
                : "Nenhuma meta definida"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-2xl font-bold">{Math.round(progress)}%</span>
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
        </div>

        {goals.length > 0 && (
          <>
            <div className="w-full h-2 bg-secondary rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-3">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => toggleGoal(goal.id)}
                >
                  <Checkbox
                    checked={goal.completed}
                    onCheckedChange={() => toggleGoal(goal.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span
                    className={`flex-1 ${
                      goal.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {goal.goal_text}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {goals.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhuma meta semanal definida ainda
            </p>
            <Button
              onClick={() => navigate("/goals")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Adicionar Metas
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default GoalsChecklist;
