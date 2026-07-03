import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { todayBrasiliaISO, nowBrasilia } from "@/lib/dateUtils";
import { fetchAllRows } from "@/lib/supabaseUtils";
import DashboardHeader from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Wallet, 
  TrendingDown, 
  Calendar,
  Tag,
  FileText,
  DollarSign,
  Printer,
  Download
} from "lucide-react";
import { QuickDateFilters } from "@/components/QuickDateFilters";
import { exportToCSV, handlePrint } from "@/lib/exportUtils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Investment {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  notes: string | null;
}

const CATEGORIES = [
  "Marketing",
  "Equipamentos",
  "Software/Ferramentas",
  "Infraestrutura",
  "Treinamento",
  "Fornecedores",
  "Operacional",
  "Outros",
];

const CATEGORY_COLORS: Record<string, string> = {
  Marketing: "#e74c3c",
  Equipamentos: "#3498db",
  "Software/Ferramentas": "#9b59b6",
  Infraestrutura: "#f39c12",
  Treinamento: "#1abc9c",
  Fornecedores: "#e67e22",
  Operacional: "#2ecc71",
  Outros: "#95a5a6",
};

const initialFormData = {
  date: todayBrasiliaISO(),
  category: "",
  description: "",
  amount: "",
  notes: "",
};

const Investments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [dateRange, setDateRange] = useState<{from: Date | null; to: Date | null}>({ from: null, to: null });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchInvestments();
    };
    checkAuth();
  }, [navigate]);

  const fetchInvestments = async () => {
    try {
      const data = await fetchAllRows("investments", "*", (q) => 
        q.order("date", { ascending: false })
      );

      setInvestments(data || []);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedInvestment(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast({ title: "Erro", description: "Selecione uma categoria.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("investments").insert({
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      notes: formData.notes || null,
    });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar.", variant: "destructive" });
      return;
    }

    toast({ title: "Sucesso", description: "Investimento adicionado!" });
    setIsAddDialogOpen(false);
    resetForm();
    fetchInvestments();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestment) return;

    const { error } = await supabase
      .from("investments")
      .update({
        date: formData.date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null,
      })
      .eq("id", selectedInvestment.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
      return;
    }

    toast({ title: "Sucesso", description: "Investimento atualizado!" });
    setIsEditDialogOpen(false);
    resetForm();
    fetchInvestments();
  };

  const handleDelete = async () => {
    if (!selectedInvestment) return;

    const { error } = await supabase
      .from("investments")
      .delete()
      .eq("id", selectedInvestment.id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
      return;
    }

    toast({ title: "Sucesso", description: "Investimento excluído!" });
    setIsDeleteDialogOpen(false);
    resetForm();
    fetchInvestments();
  };

  const openEditDialog = (investment: Investment) => {
    setSelectedInvestment(investment);
    setFormData({
      date: investment.date,
      category: investment.category,
      description: investment.description,
      amount: investment.amount.toString(),
      notes: investment.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (investment: Investment) => {
    setSelectedInvestment(investment);
    setIsDeleteDialogOpen(true);
  };

  const filteredInvestments = investments.filter(inv => {
    if (!dateRange.from || !dateRange.to) return true;
    const invDate = new Date(inv.date);
    const compareDate = new Date(invDate.getFullYear(), invDate.getMonth(), invDate.getDate());
    const fromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
    const toDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
    return compareDate >= fromDate && compareDate <= toDate;
  });

  // Metrics
  const totalInvested = filteredInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const currentMonth = nowBrasilia();
  const monthlyInvestments = filteredInvestments.filter(inv => {
    const date = new Date(inv.date);
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  });
  const monthlyTotal = monthlyInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0);

  // Chart data
  const categoryTotals = filteredInvestments.reduce((acc, inv) => {
    acc[inv.category] = (acc[inv.category] || 0) + Number(inv.amount);
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      name: category,
      value: amount,
      fill: CATEGORY_COLORS[category] || "hsl(0, 0%, 50%)",
    }))
    .sort((a, b) => b.value - a.value);

  const chartConfig = Object.fromEntries(
    Object.entries(CATEGORY_COLORS).map(([category, color]) => [
      category,
      { label: category, color },
    ])
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-foreground">Investimentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle os gastos e investimentos da AUTH</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="border-border hidden md:flex" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" className="border-border hidden md:flex" onClick={() => exportToCSV(filteredInvestments, `investimentos-${new Date().toISOString().split('T')[0]}.csv`)}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Investimento
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <QuickDateFilters onSelectRange={setDateRange} />
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Investido</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Este Mês</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {monthlyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-card border-border sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-secondary">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Registros</p>
                <p className="text-xl font-bold text-foreground">
                  {filteredInvestments.length} <span className="text-sm font-normal text-muted-foreground">total</span>
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <Card className="p-5 bg-card border-border">
            <h2 className="text-sm font-medium text-foreground mb-4">Por Categoria</h2>
            {pieData.length > 0 ? (
              <>
                <ChartContainer config={chartConfig} className="h-[200px] mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 space-y-2">
                  {pieData.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-foreground font-medium">
                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum investimento
              </div>
            )}
          </Card>

          {/* Investments List */}
          <Card className="p-5 bg-card border-border lg:col-span-2">
            <h2 className="text-sm font-medium text-foreground mb-4">Histórico</h2>
            
            {filteredInvestments.length === 0 ? (
              <div className="py-12 text-center">
                <Wallet className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum investimento registrado</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar primeiro
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {filteredInvestments.map((inv) => (
                  <div 
                    key={inv.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div 
                        className="w-1 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[inv.category] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{inv.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(inv.date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{inv.category}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        R$ {Number(inv.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(inv)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(inv)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Investimento</DialogTitle>
              <DialogDescription>Registre um novo gasto ou investimento</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-date" className="text-xs">Data</Label>
                  <Input
                    id="add-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-amount" className="text-xs">Valor (R$)</Label>
                  <Input
                    id="add-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0,00"
                    required
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="add-category" className="text-xs">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="add-category" className="h-9">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                          />
                          {cat}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-description" className="text-xs">Descrição</Label>
                <Input
                  id="add-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Anúncios no Instagram"
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-notes" className="text-xs">Observações (opcional)</Label>
                <Textarea
                  id="add-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalhes adicionais..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Investimento
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Investimento</DialogTitle>
              <DialogDescription>Atualize as informações do investimento</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-date" className="text-xs">Data</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-amount" className="text-xs">Valor (R$)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0,00"
                    required
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="edit-category" className="text-xs">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="edit-category" className="h-9">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                          />
                          {cat}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-description" className="text-xs">Descrição</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Anúncios no Instagram"
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-notes" className="text-xs">Observações (opcional)</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalhes adicionais..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Pencil className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Excluir Investimento</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir "{selectedInvestment?.description}"? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Investments;
