import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { nowBrasilia } from "@/lib/dateUtils";
import { fetchAllRows } from "@/lib/supabaseUtils";
import DashboardHeader from "@/components/DashboardHeader";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Package,
  Users,
  DollarSign,
  CreditCard,
  History,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Coins,
  Pencil,
  Trash2,
  RefreshCw,
  Timer,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addMonths, isAfter } from "date-fns";
import CAExpirationAlerts from "@/components/CAExpirationAlerts";
import { ptBR } from "date-fns/locale";
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

const purchaseSchema = z.object({
  customer_id: z.string().uuid("ID de cliente inválido"),
  package_id: z.string().uuid("ID de pacote inválido"),
  price_paid: z.string()
    .min(1, "Informe o valor pago")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Valor deve ser um número positivo"),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface CAPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  is_active: boolean;
}

interface Customer {
  id: string;
  name: string;
  ca_balance: number;
}

interface CAPurchase {
  id: string;
  customer_id: string;
  package_id: string;
  credits_purchased: number;
  credits_remaining: number;
  price_paid: number;
  purchase_date: string;
  expires_at: string;
  status: string;
  customer?: Customer;
  package?: CAPackage;
}

interface CATransaction {
  id: string;
  customer_id: string;
  purchase_id: string | null;
  type: string;
  credits: number;
  description: string | null;
  created_at: string;
  customer?: Customer;
}

const PackagesCA = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<CAPackage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<CAPurchase[]>([]);
  const [transactions, setTransactions] = useState<CATransaction[]>([]);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
const [editingPurchase, setEditingPurchase] = useState<CAPurchase | null>(null);
  const [selectedPackageCredits, setSelectedPackageCredits] = useState<number>(0);
  const [isEditBalanceDialogOpen, setIsEditBalanceDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [processingExpired, setProcessingExpired] = useState(false);

  const purchaseForm = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      customer_id: "",
      package_id: "",
      price_paid: "",
    },
  });

  const packageForm = useForm({
    defaultValues: {
      name: "",
      credits: "",
      price: "",
    },
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

    await fetchAllData();
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPackages(),
        fetchCustomers(),
        fetchPurchases(),
        fetchTransactions(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from("ca_packages")
      .select("*")
      .eq("is_active", true)
      .order("credits", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar pacotes",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setPackages(data || []);
  };

  const fetchCustomers = async () => {
    try {
      const data = await fetchAllRows("customers", "id, name, ca_balance", (q) => q.order("name"));
      setCustomers(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchPurchases = async () => {
    try {
      const purchasesData = await fetchAllRows("ca_purchases", "*", (q) => q.order("purchase_date", { ascending: false }));

      // Fetch related data
      const customersData = await fetchAllRows("customers", "id, name, ca_balance");
      const packagesData = await fetchAllRows("ca_packages", "*");

      const enrichedPurchases = (purchasesData || []).map((purchase) => ({
        ...purchase,
        customer: customersData?.find((c) => c.id === purchase.customer_id),
        package: packagesData?.find((p) => p.id === purchase.package_id),
      }));

      setPurchases(enrichedPurchases);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar compras",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchTransactions = async () => {
    const { data: transactionsData, error: transactionsError } = await supabase
      .from("ca_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (transactionsError) {
      toast({
        title: "Erro ao carregar transações",
        description: transactionsError.message,
        variant: "destructive",
      });
      return;
    }

    const customersData = await fetchAllRows("customers", "id, name, ca_balance");

    const enrichedTransactions = (transactionsData || []).map((tx) => ({
      ...tx,
      customer: customersData?.find((c) => c.id === tx.customer_id),
    }));

    setTransactions(enrichedTransactions);
  };

  const handlePackageChange = (packageId: string) => {
    const selectedPkg = packages.find((p) => p.id === packageId);
    if (selectedPkg) {
      setSelectedPackageCredits(selectedPkg.credits);
      purchaseForm.setValue("price_paid", selectedPkg.price.toString());
    }
  };

  const onPurchaseSubmit = async (data: PurchaseFormData) => {
    try {
      const selectedPackage = packages.find((p) => p.id === data.package_id);
      if (!selectedPackage) throw new Error("Pacote não encontrado");

      const expiresAt = addMonths(nowBrasilia(), 1);
      const pricePaid = parseFloat(data.price_paid);

      // Create purchase
      const { data: purchaseData, error: purchaseError } = await supabase
        .from("ca_purchases")
        .insert({
          customer_id: data.customer_id,
          package_id: data.package_id,
          credits_purchased: selectedPackage.credits,
          credits_remaining: selectedPackage.credits,
          price_paid: pricePaid,
          expires_at: expiresAt.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create transaction
      const { error: txError } = await supabase.from("ca_transactions").insert({
        customer_id: data.customer_id,
        purchase_id: purchaseData.id,
        type: "credit",
        credits: selectedPackage.credits,
        description: `Compra de ${selectedPackage.name} - R$ ${pricePaid.toFixed(2)}`,
      });

      if (txError) throw txError;

      // Update customer balance
      const customer = customers.find((c) => c.id === data.customer_id);
      const newBalance = (customer?.ca_balance || 0) + selectedPackage.credits;

      const { error: updateError } = await supabase
        .from("customers")
        .update({ ca_balance: newBalance })
        .eq("id", data.customer_id);

      if (updateError) throw updateError;

      toast({
        title: "Pacote vendido com sucesso!",
        description: `${selectedPackage.credits} CA adicionados ao cliente.`,
      });

      setIsPurchaseDialogOpen(false);
      purchaseForm.reset();
      setSelectedPackageCredits(0);
      await fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar venda",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onPackageSubmit = async (data: any) => {
    try {
      const { error } = await supabase.from("ca_packages").insert({
        name: data.name,
        credits: parseInt(data.credits),
        price: parseFloat(data.price),
      });

      if (error) throw error;

      toast({
        title: "Pacote criado com sucesso!",
      });

      setIsPackageDialogOpen(false);
      packageForm.reset();
      await fetchPackages();
    } catch (error: any) {
      toast({
        title: "Erro ao criar pacote",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    try {
      // Check if package has any purchases
      const { data: purchasesWithPackage } = await supabase
        .from("ca_purchases")
        .select("id")
        .eq("package_id", packageId)
        .limit(1);

      if (purchasesWithPackage && purchasesWithPackage.length > 0) {
        // Soft delete - just mark as inactive
        const { error } = await supabase
          .from("ca_packages")
          .update({ is_active: false })
          .eq("id", packageId);

        if (error) throw error;

        toast({
          title: "Pacote desativado com sucesso!",
          description: "O pacote foi desativado pois possui vendas associadas.",
        });
      } else {
        // Hard delete - no purchases associated
        const { error } = await supabase
          .from("ca_packages")
          .delete()
          .eq("id", packageId);

        if (error) throw error;

        toast({
          title: "Pacote excluído com sucesso!",
        });
      }

      await fetchPackages();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir pacote",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditPurchase = (purchase: CAPurchase) => {
    setEditingPurchase(purchase);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePurchase = async () => {
    if (!editingPurchase) return;

    try {
      // Find the original purchase to detect changes
      const originalPurchase = purchases.find((p) => p.id === editingPurchase.id);
      if (!originalPurchase) throw new Error("Compra original não encontrada");

      const newExpiresAt = new Date(editingPurchase.expires_at);
      const now = nowBrasilia();
      const wasExpired = isAfter(now, new Date(originalPurchase.expires_at)) || originalPurchase.status === "expired";
      const willBeExpired = isAfter(now, newExpiresAt);
      const dateChanged = originalPurchase.expires_at !== editingPurchase.expires_at;

      // Determine the correct status based on the new expiration date
      let newStatus = editingPurchase.status;
      if (dateChanged) {
        if (!willBeExpired && editingPurchase.credits_remaining > 0) {
          newStatus = "active";
        } else if (willBeExpired && editingPurchase.credits_remaining > 0) {
          newStatus = "expired";
        }
      }

      // Update the purchase
      const { error } = await supabase
        .from("ca_purchases")
        .update({
          credits_remaining: editingPurchase.credits_remaining,
          price_paid: editingPurchase.price_paid,
          expires_at: editingPurchase.expires_at,
          status: newStatus,
        })
        .eq("id", editingPurchase.id);

      if (error) throw error;

      // If date changed, handle customer balance adjustments
      if (dateChanged && editingPurchase.customer_id) {
        const customer = customers.find((c) => c.id === editingPurchase.customer_id);
        if (customer) {
          let balanceAdjustment = 0;

          // Was expired, now active → restore credits to balance
          if (wasExpired && !willBeExpired && editingPurchase.credits_remaining > 0) {
            balanceAdjustment = editingPurchase.credits_remaining;
          }
          // Was active, now expired → remove credits from balance
          else if (!wasExpired && willBeExpired && editingPurchase.credits_remaining > 0) {
            balanceAdjustment = -editingPurchase.credits_remaining;
          }

          if (balanceAdjustment !== 0) {
            const updatedBalance = Math.max(0, customer.ca_balance + balanceAdjustment);
            await supabase
              .from("customers")
              .update({ ca_balance: updatedBalance })
              .eq("id", editingPurchase.customer_id);

            // Record transaction for audit
            await supabase.from("ca_transactions").insert({
              customer_id: editingPurchase.customer_id,
              purchase_id: editingPurchase.id,
              type: balanceAdjustment > 0 ? "credit" : "debit",
              credits: Math.abs(balanceAdjustment),
              description: `Alteração de validade: ${format(new Date(originalPurchase.expires_at), "dd/MM/yyyy")} → ${format(newExpiresAt, "dd/MM/yyyy")}`,
            });
          }
        }
      }

      toast({
        title: "Venda atualizada com sucesso!",
        description: dateChanged
          ? `Validade alterada para ${format(newExpiresAt, "dd/MM/yyyy")}. Status: ${newStatus === "active" ? "Ativo" : newStatus === "expired" ? "Expirado" : newStatus}.`
          : undefined,
      });

      setIsEditDialogOpen(false);
      setEditingPurchase(null);
      await fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar venda",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    try {
      // Get purchase data before deleting
      const purchase = purchases.find((p) => p.id === purchaseId);
      if (!purchase) return;

      // Delete related transactions
      await supabase
        .from("ca_transactions")
        .delete()
        .eq("purchase_id", purchaseId);

      // Delete the purchase
      const { error } = await supabase
        .from("ca_purchases")
        .delete()
        .eq("id", purchaseId);

      if (error) throw error;

      // Update customer balance (subtract remaining credits)
      if (purchase.customer_id && purchase.credits_remaining > 0) {
        const customer = customers.find((c) => c.id === purchase.customer_id);
        if (customer) {
          const newBalance = Math.max(0, customer.ca_balance - purchase.credits_remaining);
          await supabase
            .from("customers")
            .update({ ca_balance: newBalance })
            .eq("id", purchase.customer_id);
        }
      }

      toast({
        title: "Venda excluída com sucesso!",
      });

      await fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir venda",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateCustomerBalance = async () => {
    if (!editingCustomer) return;

    try {
      const difference = newBalance - editingCustomer.ca_balance;

      // Update customer balance
      const { error: updateError } = await supabase
        .from("customers")
        .update({ ca_balance: newBalance })
        .eq("id", editingCustomer.id);

      if (updateError) throw updateError;

      // Create transaction record for audit
      if (difference !== 0) {
        const { error: txError } = await supabase.from("ca_transactions").insert({
          customer_id: editingCustomer.id,
          type: difference > 0 ? "credit" : "debit",
          credits: Math.abs(difference),
          description: `Ajuste manual de saldo: ${difference > 0 ? "+" : ""}${difference} CA`,
        });

        if (txError) throw txError;
      }

      toast({
        title: "Saldo atualizado com sucesso!",
        description: `Novo saldo de ${editingCustomer.name}: ${newBalance} CA`,
      });

      setIsEditBalanceDialogOpen(false);
      setEditingCustomer(null);
      await fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar saldo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Metrics
  const totalRevenue = purchases.reduce((sum, p) => sum + Number(p.price_paid), 0);
  const totalCreditsActive = purchases
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.credits_remaining, 0);
  const totalPurchases = purchases.length;
  const customersWithCredits = customers.filter((c) => c.ca_balance > 0).length;

  // Calculate expired CA that need processing
  const expiredPurchasesToProcess = purchases.filter(
    (p) => p.status === "active" && isAfter(nowBrasilia(), new Date(p.expires_at)) && p.credits_remaining > 0
  );
  const expiredCreditsValue = expiredPurchasesToProcess.reduce((sum, p) => {
    const unitPrice = p.price_paid / p.credits_purchased;
    return sum + unitPrice * p.credits_remaining;
  }, 0);
  const expiredCreditsCount = expiredPurchasesToProcess.reduce((sum, p) => sum + p.credits_remaining, 0);

  // Process expired CA function
  const handleProcessExpiredCA = async () => {
    if (expiredPurchasesToProcess.length === 0) {
      toast({
        title: "Nenhum CA expirado",
        description: "Não há créditos expirados para processar.",
      });
      return;
    }

    setProcessingExpired(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-expired-ca");

      if (error) throw error;

      toast({
        title: "CAs expirados processados!",
        description: `${data.processed} pacotes processados. Valor adicionado ao faturamento.`,
      });

      await fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao processar CAs expirados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingExpired(false);
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = isAfter(nowBrasilia(), new Date(expiresAt));
    
    if (isExpired || status === "expired") {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (status === "consumed") {
      return <Badge variant="secondary">Consumido</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "credit":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Crédito</Badge>;
      case "debit":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Débito</Badge>;
      case "expiration":
        return <Badge variant="destructive">Expiração</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

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
        <CAExpirationAlerts purchases={purchases} />
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl font-medium text-foreground">
            Pacotes CA (Créditos AUTH)
          </h2>
          <div className="flex gap-3">
            {expiredPurchasesToProcess.length > 0 && (
              <Button
                variant="outline"
                className="border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400"
                onClick={handleProcessExpiredCA}
                disabled={processingExpired}
              >
                {processingExpired ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Timer className="mr-2 h-4 w-4" />
                )}
                Processar {expiredCreditsCount} CA Expirados (R$ {expiredCreditsValue.toFixed(2)})
              </Button>
            )}
            <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border hover:bg-muted">
                  <Package className="mr-2 h-4 w-4" />
                  Novo Pacote
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Pacote</DialogTitle>
                  <DialogDescription>
                    Defina um novo tipo de pacote de créditos.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={packageForm.handleSubmit(onPackageSubmit)} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nome do Pacote</label>
                    <Input
                      {...packageForm.register("name")}
                      placeholder="Ex: Pacote 5 CA"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantidade de Créditos</label>
                    <Input
                      {...packageForm.register("credits")}
                      type="number"
                      placeholder="Ex: 5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Preço Sugerido (R$)</label>
                    <Input
                      {...packageForm.register("price")}
                      type="number"
                      step="0.01"
                      placeholder="Ex: 100.00"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Criar Pacote
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Venda
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Registrar Venda de Pacote CA</DialogTitle>
                  <DialogDescription>
                    Registre a venda de um pacote de créditos para um cliente.
                  </DialogDescription>
                </DialogHeader>
                <Form {...purchaseForm}>
                  <form onSubmit={purchaseForm.handleSubmit(onPurchaseSubmit)} className="space-y-4">
                    <FormField
                      control={purchaseForm.control}
                      name="customer_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name} ({customer.ca_balance} CA)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={purchaseForm.control}
                      name="package_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pacote *</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handlePackageChange(value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o pacote" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {packages.map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id}>
                                  {pkg.name} - {pkg.credits} créditos
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedPackageCredits > 0 && (
                      <Card className="p-4 bg-muted border-border">
                        <div className="flex items-center gap-2">
                          <Coins className="h-5 w-5 text-foreground" />
                          <span className="text-foreground font-semibold">
                            {selectedPackageCredits} Créditos AUTH
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Válido por 30 dias a partir da compra
                        </p>
                      </Card>
                    )}

                    <FormField
                      control={purchaseForm.control}
                      name="price_paid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Pago (R$) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Registrar Venda
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <DollarSign className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <CreditCard className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pacotes Vendidos</p>
                <p className="text-2xl font-bold text-foreground">{totalPurchases}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <Coins className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CA Ativos</p>
                <p className="text-2xl font-bold text-foreground">{totalCreditsActive}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-card/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <Users className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes com CA</p>
                <p className="text-2xl font-bold text-foreground">{customersWithCredits}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="purchases" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="purchases" className="data-[state=active]:bg-muted">
              <CreditCard className="mr-2 h-4 w-4" />
              Pacotes Vendidos
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-muted">
              <Users className="mr-2 h-4 w-4" />
              Saldo por Cliente
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-muted">
              <History className="mr-2 h-4 w-4" />
              Movimentações
            </TabsTrigger>
            <TabsTrigger value="packages" className="data-[state=active]:bg-muted">
              <Package className="mr-2 h-4 w-4" />
              Tipos de Pacotes
            </TabsTrigger>
          </TabsList>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            <Card className="border-border bg-card/50">
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Histórico de Vendas de Pacotes
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pacote</TableHead>
                        <TableHead className="text-center">Créditos</TableHead>
                        <TableHead className="text-center">Restantes</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Nenhuma venda registrada ainda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        purchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell>
                              {format(new Date(purchase.purchase_date), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {purchase.customer?.name || "Cliente não encontrado"}
                            </TableCell>
                            <TableCell>{purchase.package?.name || "-"}</TableCell>
                            <TableCell className="text-center">
                              {purchase.credits_purchased}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-foreground">
                              {purchase.credits_remaining}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {Number(purchase.price_paid).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {format(new Date(purchase.expires_at), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(purchase.status, purchase.expires_at)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleEditPurchase(purchase)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Venda</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir esta venda? Os créditos restantes serão removidos do saldo do cliente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeletePurchase(purchase.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Edit Purchase Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Editar Venda</DialogTitle>
                <DialogDescription>
                  Altere os dados da venda do pacote.
                </DialogDescription>
              </DialogHeader>
              {editingPurchase && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Cliente</label>
                    <Input
                      value={editingPurchase.customer?.name || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Pacote</label>
                    <Input
                      value={editingPurchase.package?.name || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Créditos Comprados</label>
                      <Input
                        value={editingPurchase.credits_purchased}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Créditos Restantes</label>
                      <Input
                        type="number"
                        value={editingPurchase.credits_remaining}
                        onChange={(e) =>
                          setEditingPurchase({
                            ...editingPurchase,
                            credits_remaining: parseInt(e.target.value) || 0,
                          })
                        }
                        min={0}
                        max={editingPurchase.credits_purchased}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Valor Pago (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingPurchase.price_paid}
                      onChange={(e) =>
                        setEditingPurchase({
                          ...editingPurchase,
                          price_paid: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data de Validade</label>
                    <Input
                      type="date"
                      value={editingPurchase.expires_at.split("T")[0]}
                      onChange={(e) =>
                        setEditingPurchase({
                          ...editingPurchase,
                          expires_at: new Date(e.target.value + "T23:59:59").toISOString(),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={editingPurchase.status}
                      onValueChange={(value) =>
                        setEditingPurchase({ ...editingPurchase, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="consumed">Consumido</SelectItem>
                        <SelectItem value="expired">Expirado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditDialogOpen(false);
                        setEditingPurchase(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleUpdatePurchase}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Customer Balance Dialog */}
          <Dialog open={isEditBalanceDialogOpen} onOpenChange={setIsEditBalanceDialogOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Editar Saldo de CA</DialogTitle>
                <DialogDescription>
                  Altere manualmente o saldo de créditos AUTH do cliente.
                </DialogDescription>
              </DialogHeader>
              {editingCustomer && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Cliente</label>
                    <Input
                      value={editingCustomer.name}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Saldo Atual</label>
                    <Input
                      value={`${editingCustomer.ca_balance} CA`}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Novo Saldo (CA)</label>
                    <Input
                      type="number"
                      value={newBalance}
                      onChange={(e) => setNewBalance(parseInt(e.target.value) || 0)}
                      min={0}
                    />
                    {newBalance !== editingCustomer.ca_balance && (
                      <p className={`text-sm mt-1 ${newBalance > editingCustomer.ca_balance ? "text-green-500" : "text-orange-500"}`}>
                        {newBalance > editingCustomer.ca_balance 
                          ? `+${newBalance - editingCustomer.ca_balance} CA` 
                          : `${newBalance - editingCustomer.ca_balance} CA`}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditBalanceDialogOpen(false);
                        setEditingCustomer(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleUpdateCustomerBalance}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card className="border-border bg-card/50">
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Saldo de CA por Cliente
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-center">Saldo Atual (CA)</TableHead>
                        <TableHead className="text-center">Pacotes Ativos</TableHead>
                        <TableHead className="text-right">Total Investido</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers
                        .filter((c) => c.ca_balance > 0 || purchases.some((p) => p.customer_id === c.id))
                        .sort((a, b) => b.ca_balance - a.ca_balance)
                        .map((customer) => {
                          const customerPurchases = purchases.filter(
                            (p) => p.customer_id === customer.id
                          );
                          const activePurchases = customerPurchases.filter(
                            (p) => p.status === "active" && !isAfter(nowBrasilia(), new Date(p.expires_at))
                          );
                          const totalInvested = customerPurchases.reduce(
                            (sum, p) => sum + Number(p.price_paid),
                            0
                          );

                          return (
                            <TableRow key={customer.id}>
                              <TableCell className="font-medium">{customer.name}</TableCell>
                              <TableCell className="text-center">
                                <span className={`font-bold text-lg ${customer.ca_balance > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                                  {customer.ca_balance} CA
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {activePurchases.length}
                              </TableCell>
                              <TableCell className="text-right">
                                R$ {totalInvested.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    setEditingCustomer(customer);
                                    setNewBalance(customer.ca_balance);
                                    setIsEditBalanceDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {customers.filter((c) => c.ca_balance > 0 || purchases.some((p) => p.customer_id === c.id)).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum cliente com pacotes CA ainda.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="border-border bg-card/50">
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Movimentações de Créditos
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-center">Créditos</TableHead>
                        <TableHead>Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhuma movimentação registrada ainda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {tx.customer?.name || "Cliente não encontrado"}
                            </TableCell>
                            <TableCell className="text-center">
                              {getTransactionBadge(tx.type)}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              <span className={tx.type === "credit" ? "text-green-400" : "text-red-400"}>
                                {tx.type === "credit" ? "+" : "-"}{tx.credits}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {tx.description || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages">
            <Card className="border-border bg-card/50">
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Tipos de Pacotes Disponíveis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {packages.map((pkg) => (
                    <Card key={pkg.id} className="p-6 border-border bg-card relative">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Pacote</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o pacote "{pkg.name}"? 
                              Se houver vendas associadas, o pacote será apenas desativado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePackage(pkg.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                          <Coins className="h-8 w-8 text-foreground" />
                        </div>
                        <h4 className="text-lg font-bold text-foreground mb-2">{pkg.name}</h4>
                        <p className="text-3xl font-bold text-foreground mb-2">{pkg.credits} CA</p>
                        <p className="text-sm text-muted-foreground">
                          Preço sugerido: R$ {Number(pkg.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PackagesCA;
