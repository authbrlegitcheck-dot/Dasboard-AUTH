import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { currentMonthBrasilia, formatDateBrasiliaOptions, dateKeyBrasilia } from "@/lib/dateUtils";
import DashboardHeader from "@/components/DashboardHeader";
import { RetentionCohort } from "@/components/RetentionCohort";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Users,
  DollarSign,
  ShieldCheck,
  Eye,
  Edit,
  Trash2,
  Instagram,
  Mail,
  Phone,
  Receipt,
  TrendingUp,
  Wallet,
  Calendar,
  Percent,
  Activity,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const customerSchema = z.object({
  name: z.string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .transform(val => val.trim()),
  email: z.string()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .optional(),
  instagram: z.string()
    .max(50, "Instagram deve ter no máximo 50 caracteres")
    .regex(/^[a-zA-Z0-9._]*$/, "Instagram inválido")
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .max(1000, "Notas devem ter no máximo 1000 caracteres")
    .optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  notes: string | null;
  created_at: string;
}

interface CustomerWithMetrics extends Customer {
  total_spent: number;
  total_authentications: number;
  last_auth_date: string | null;
  is_churn_risk: boolean;
  abc_class: 'A' | 'B' | 'C';
}

interface MonthlyNetRevenue {
  month: string;
  revenue: number;
  costs: number;
  netRevenue: number;
}

const CRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerWithMetrics[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithMetrics | null>(null);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [totalInvestments, setTotalInvestments] = useState(0);
  const [totalMarketingInvestments, setTotalMarketingInvestments] = useState(0);
  const [currentMonthInvestments, setCurrentMonthInvestments] = useState(0);
  const [monthlyNetRevenue, setMonthlyNetRevenue] = useState<MonthlyNetRevenue | null>(null);
  const [totalAuthenticationsCount, setTotalAuthenticationsCount] = useState(0);
  const [totalRevenueFromAuth, setTotalRevenueFromAuth] = useState(0);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      instagram: "",
      notes: "",
    },
  });

  const editForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    await syncCustomersFromAuthentications();
    await fetchInvestments();
    fetchCustomers();
  };

  const fetchInvestments = async () => {
    try {
      const { data: investmentsData, error } = await supabase
        .from("investments")
        .select("amount, date, category");

      if (error) throw error;

      const total = investmentsData?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const marketingTotal = investmentsData
        ?.filter(inv => inv.category === "Marketing")
        .reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      
      setTotalInvestments(total);
      setTotalMarketingInvestments(marketingTotal);

      // Current month investments
      const currentMonth = currentMonthBrasilia();
      const monthlyInv = investmentsData?.filter(inv => inv.date.startsWith(currentMonth)) || [];
      const monthlyTotal = monthlyInv.reduce((sum, inv) => sum + Number(inv.amount), 0);
      setCurrentMonthInvestments(monthlyTotal);
    } catch (error: any) {
      console.error("Error fetching investments:", error);
    }
  };

  const syncCustomersFromAuthentications = async () => {
    try {
      // Get all unique requester names from authentications
      const { data: authentications } = await supabase
        .from("authentications")
        .select("requester_name");

      if (!authentications) return;

      const uniqueRequesters = [...new Set(authentications.map(a => a.requester_name))];

      // Get all existing customer names
      const { data: existingCustomers } = await supabase
        .from("customers")
        .select("name");

      const existingNames = new Set(existingCustomers?.map(c => c.name) || []);

      // Find requesters not in customers
      const missingCustomers = uniqueRequesters.filter(name => !existingNames.has(name));

      // Insert missing customers
      if (missingCustomers.length > 0) {
        await supabase.from("customers").insert(
          missingCustomers.map(name => ({ name }))
        );
      }
    } catch {
      // Silently handle sync errors - non-critical operation
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (customersError) throw customersError;

      const { data: authenticationsData, error: authError } = await supabase
        .from("authentications")
        .select("*");

      if (authError) throw authError;

      // Set total authentications count and revenue directly from the database (same as Index.tsx)
      setTotalAuthenticationsCount(authenticationsData?.length || 0);
      setTotalRevenueFromAuth(authenticationsData?.reduce((sum, auth) => sum + Number(auth.price), 0) || 0);

      const customersWithMetrics = customersData?.map((customer) => {
        // Match by customer_id OR by requester_name
        const customerAuths = authenticationsData?.filter(
          (auth) => auth.customer_id === customer.id || auth.requester_name === customer.name
        ) || [];
        
        // Obter a data da última autenticação
        const sortedAuths = [...customerAuths].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const last_auth_date = sortedAuths.length > 0 ? sortedAuths[0].date : null;
        
        let custom_churn_threshold = 45;
        if (sortedAuths.length > 1) {
          const first_auth_date = sortedAuths[sortedAuths.length - 1].date;
          const daysBetweenFirstAndLast = Math.floor((new Date(last_auth_date!).getTime() - new Date(first_auth_date).getTime()) / (1000 * 60 * 60 * 24));
          const avgDaysBetweenPurchases = daysBetweenFirstAndLast / (sortedAuths.length - 1);
          custom_churn_threshold = Math.max(30, Math.min(90, avgDaysBetweenPurchases * 1.5));
        }

        let is_churn_risk = false;
        if (last_auth_date) {
            const daysSinceLastAuth = Math.floor((new Date().getTime() - new Date(last_auth_date).getTime()) / (1000 * 60 * 60 * 24));
            is_churn_risk = daysSinceLastAuth > custom_churn_threshold;
        }

        return {
          ...customer,
          total_spent: customerAuths.reduce((sum, auth) => sum + Number(auth.price), 0),
          total_authentications: customerAuths.length,
          last_auth_date,
          is_churn_risk,
        };
      }) || [];

      // Ordenar por Total Gasto (decrescente) e depois por número de autenticações (decrescente)
      const sortedCustomers = customersWithMetrics.sort((a, b) => {
        if (b.total_spent !== a.total_spent) {
          return b.total_spent - a.total_spent;
        }
        return b.total_authentications - a.total_authentications;
      });

      // Calcular Curva ABC baseada no faturamento total de autenticações
      const totalRev = authenticationsData?.reduce((sum, auth) => sum + Number(auth.price), 0) || 0;
      let runningTotal = 0;
      
      const customersWithABC = sortedCustomers.map(customer => {
        runningTotal += customer.total_spent;
        const percentage = totalRev > 0 ? (runningTotal / totalRev) * 100 : 0;
        
        let abc_class: 'A' | 'B' | 'C' = 'C';
        if (percentage <= 80) {
          abc_class = 'A';
        } else if (percentage <= 95) {
          abc_class = 'B';
        }

        return {
          ...customer,
          abc_class
        };
      });

      setCustomers(customersWithABC);
      
      // Calculate current month revenue
      const currentMonth = currentMonthBrasilia();
      const currentMonthAuths =
        authenticationsData?.filter((auth) => dateKeyBrasilia(auth.date).startsWith(currentMonth)) || [];
      const currentMonthRev = currentMonthAuths.reduce((sum, auth) => sum + Number(auth.price), 0);
      
      // Fetch current month investments
      const { data: investmentsData } = await supabase
        .from("investments")
        .select("amount, date, category");
      
      const monthlyInv = investmentsData?.filter(inv => inv.date.startsWith(currentMonth)) || [];
      const monthlyInvTotal = monthlyInv.reduce((sum, inv) => sum + Number(inv.amount), 0);
      
      setMonthlyNetRevenue({
        month: currentMonth,
        revenue: currentMonthRev,
        costs: monthlyInvTotal,
        netRevenue: currentMonthRev - monthlyInvTotal,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const { error } = await supabase.from("customers").insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        instagram: data.instagram || null,
        notes: data.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Cliente adicionado",
        description: "Cliente cadastrado com sucesso!",
      });

      form.reset();
      setIsAddDialogOpen(false);
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onEditSubmit = async (data: CustomerFormData) => {
    if (!editingCustomer) return;

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          instagram: data.instagram || null,
          notes: data.notes || null,
        })
        .eq("id", editingCustomer.id);

      if (error) throw error;

      toast({
        title: "Cliente atualizado",
        description: "Informações atualizadas com sucesso!",
      });

      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;

      toast({
        title: "Cliente excluído",
        description: "Cliente removido com sucesso!",
      });

      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewCustomer = async (customer: CustomerWithMetrics) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);

    try {
      const { data, error } = await supabase
        .from("authentications")
        .select("*")
        .eq("customer_id", customer.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setCustomerHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    editForm.reset({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      instagram: customer.instagram || "",
      notes: customer.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const totalCustomers = customers.length;
  // Use the totals from database directly (same as Index.tsx)
  const totalRevenue = totalRevenueFromAuth;
  const totalAuths = totalAuthenticationsCount;
  const averageLTV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  
  // Only consider 'Marketing' category for CAC as per user request
  const CAC = totalCustomers > 0 ? totalMarketingInvestments / totalCustomers : 0;
  const LtvCacRatio = CAC > 0 ? (averageLTV / CAC) : 0;
  
  // Net Revenue calculations
  const totalNetRevenue = totalRevenue - totalInvestments;
  const monthlyNetRev = monthlyNetRevenue?.netRevenue || 0;
  const monthlyGrossRev = monthlyNetRevenue?.revenue || 0;
  
  // Profit margin calculations
  const totalProfitMargin = totalRevenue > 0 ? (totalNetRevenue / totalRevenue) * 100 : 0;
  const monthlyProfitMargin = monthlyGrossRev > 0 ? (monthlyNetRev / monthlyGrossRev) * 100 : 0;
  
  // Current month label
  const currentMonthLabel = formatDateBrasiliaOptions(new Date(), { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl font-medium text-foreground">
            Gestão de Clientes (CRM)
          </h2>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                <DialogDescription>
                  Cadastre um novo cliente no sistema.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do cliente" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="email@exemplo.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="@username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Notas sobre o cliente" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Cadastrar Cliente
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Métricas do CRM */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <Users className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold text-foreground">{totalCustomers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <DollarSign className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Bruta Total</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <ShieldCheck className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Autenticações</p>
                <p className="text-2xl font-bold text-foreground">{totalAuths}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Métricas de Faturamento Líquido */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-success/20 bg-gradient-to-br from-card to-success/10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/20">
                <Wallet className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Líquido Total</p>
                <p className={`text-2xl font-bold ${totalNetRevenue >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {totalNetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receita - Investimentos
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-primary/20 bg-gradient-to-br from-card to-primary/10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fat. Líquido do Mês</p>
                <p className={`text-2xl font-bold ${(monthlyNetRevenue?.netRevenue || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  R$ {(monthlyNetRevenue?.netRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentMonthLabel}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-destructive/20 bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <Receipt className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investimentos Totais</p>
                <p className="text-2xl font-bold text-destructive">
                  R$ {totalInvestments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Métricas de Health e Aquisição */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <TrendingUp className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LTV Médio</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {averageLTV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <DollarSign className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CAC Médio (Marketing)</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {CAC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Investimentos em Marketing / Clientes</p>
              </div>
            </div>
          </Card>

          <Card className={`p-6 border-${LtvCacRatio >= 3 ? 'success' : LtvCacRatio >= 1 ? 'amber-500' : 'destructive'}/20 bg-card/50`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-${LtvCacRatio >= 3 ? 'success' : LtvCacRatio >= 1 ? 'amber-500' : 'destructive'}/10`}>
                <Activity className={`h-6 w-6 text-${LtvCacRatio >= 3 ? 'success' : LtvCacRatio >= 1 ? 'amber-500' : 'destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proporção LTV / CAC (Mkt)</p>
                <p className={`text-2xl font-bold text-${LtvCacRatio >= 3 ? 'success' : LtvCacRatio >= 1 ? 'amber-500' : 'destructive'}`}>
                  {LtvCacRatio.toFixed(1)}x
                </p>
                <p className="text-xs text-muted-foreground mt-1">Ideal é &ge; 3.0x</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-destructive/20 bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <Receipt className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investimentos Totais</p>
                <p className="text-2xl font-bold text-destructive">
                  R$ {totalInvestments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Métricas de Margem de Lucro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <Percent className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Margem de Lucro Total</p>
                <p className={`text-2xl font-bold ${totalProfitMargin >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {totalProfitMargin.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  fat. líquido / receita bruta
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-gradient-to-br from-card to-muted/30">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <Percent className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Margem de Lucro (Mês)</p>
                <p className={`text-2xl font-bold ${monthlyProfitMargin >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {monthlyProfitMargin.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentMonthLabel}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-8">
          <RetentionCohort />
        </div>

        {/* Tabela de Clientes */}
        <Card className="border-border bg-card/50">
          <div className="p-6">
            <h3 className="text-xl font-bold text-foreground mb-4">Lista de Clientes</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right">Autenticações</TableHead>
                    <TableHead className="text-right">Total Gasto (LTV)</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-center">Curva ABC</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium align-top pt-4">
                        <div className="flex flex-col gap-1.5">
                          <span>{customer.name}</span>
                          {customer.is_churn_risk && (
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold bg-destructive/10 text-destructive border-destructive/20 w-fit tracking-wide uppercase">
                              Risco de Churn (Inativo)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {customer.instagram && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Instagram className="h-3 w-3" />
                              <span>{customer.instagram}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{customer.total_authentications}</TableCell>
                      <TableCell className="text-right">
                        R$ {customer.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center font-bold text-xs h-6 w-6 rounded-md ${
                          customer.abc_class === 'A' ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30' :
                          customer.abc_class === 'B' ? 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800' :
                          'bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/50'
                        }`}>
                          {customer.abc_class}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Receipt className="h-3.5 w-3.5 text-foreground" />
                          <span>
                            R$ {customer.total_authentications > 0 
                              ? (customer.total_spent / customer.total_authentications).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                              : '0,00'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewCustomer(customer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(customer.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </main>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do cliente" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@exemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(00) 00000-0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="@username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Notas sobre o cliente" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Atualizar Cliente
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium">
                    {new Date(selectedCustomer.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {selectedCustomer.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>
                )}
                {selectedCustomer.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedCustomer.phone}</p>
                  </div>
                )}
                {selectedCustomer.instagram && (
                  <div>
                    <p className="text-sm text-muted-foreground">Instagram</p>
                    <p className="font-medium">{selectedCustomer.instagram}</p>
                  </div>
                )}
              </div>

              {selectedCustomer.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedCustomer.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 border-border">
                  <p className="text-sm text-muted-foreground">Total Gasto</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {selectedCustomer.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </Card>
                <Card className="p-4 border-border">
                  <p className="text-sm text-muted-foreground">Autenticações</p>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedCustomer.total_authentications}
                  </p>
                </Card>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Histórico de Autenticações</h4>
                {customerHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {customerHistory.map((auth) => (
                      <Card key={auth.id} className="p-4 border-border/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{auth.code}</p>
                            <p className="text-sm text-muted-foreground">{auth.brand} - {auth.item_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(auth.date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${auth.result === 'AUTH' ? 'text-green-500' : 'text-red-500'}`}>
                              {auth.result}
                            </p>
                            <p className="text-sm text-foreground">
                              R$ {Number(auth.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma autenticação registrada
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRM;