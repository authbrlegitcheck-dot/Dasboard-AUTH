import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { nowBrasiliaDatetimeLocal, formatDateTimeBrasilia } from "@/lib/dateUtils";
import { fetchAllRows } from "@/lib/supabaseUtils";
import DashboardHeader from "@/components/DashboardHeader";
import MetricCard from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Store, 
  ShieldCheck, 
  DollarSign, 
  Receipt,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  ArrowLeft,
  Wallet,
  History
} from "lucide-react";

interface PartnerStore {
  id: string;
  name: string;
  code_prefix: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  credits: number;
}

interface CreditHistory {
  id: string;
  partner_store_id: string;
  amount: number;
  description: string | null;
  created_at: string;
}

interface Authentication {
  id: string;
  code: string;
  date: string;
  requester_name: string;
  brand: string;
  item_name: string;
  result: "AUTH" | "RÉPLICA";
  item_category: "roupa" | "tenis_calcados" | "personalizado";
  price: number;
  paid_with_ca: boolean;
}

const Partners = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<PartnerStore[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<PartnerStore | null>(null);
  const [storeAuths, setStoreAuths] = useState<Authentication[]>([]);
  const [editingStore, setEditingStore] = useState<PartnerStore | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    code_prefix: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    notes: "",
  });

  // New auth dialog state
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authFormData, setAuthFormData] = useState({
    date: nowBrasiliaDatetimeLocal(),
    requester_name: "",
    brand: "",
    item_name: "",
    result: "AUTH" as "AUTH" | "RÉPLICA",
    item_category: "roupa" as "roupa" | "tenis_calcados" | "personalizado",
    price: 18,
  });

  // Edit auth state
  const [editAuthDialogOpen, setEditAuthDialogOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<Authentication | null>(null);

  // Credits state
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);
  const [creditsHistoryDialogOpen, setCreditsHistoryDialogOpen] = useState(false);
  const [creditsHistory, setCreditsHistory] = useState<CreditHistory[]>([]);
  const [creditFormData, setCreditFormData] = useState({
    amount: 0,
    description: "",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchStores();
  };

  const fetchStores = async () => {
    try {
      const data = await fetchAllRows("partner_stores", "*", (q) => q.order("created_at", { ascending: false }));
      setStores(data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreAuths = async (storeId: string) => {
    try {
      const data = await fetchAllRows("authentications", "*", (q) => 
        q.eq("partner_store_id", storeId).order("code", { ascending: false })
      );
      setStoreAuths(data || []);
    } catch (error) {
      toast({ title: "Erro ao carregar autenticações", variant: "destructive" });
    }
  };

  const handleCreateStore = async () => {
    if (!formData.name || !formData.code_prefix) {
      toast({ title: "Nome e prefixo são obrigatórios", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("partner_stores").insert({
      name: formData.name,
      code_prefix: formData.code_prefix.toUpperCase(),
      contact_name: formData.contact_name || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      notes: formData.notes || null,
    });

    if (error) {
      toast({ title: "Erro ao criar loja", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Loja parceira criada com sucesso!" });
    setFormData({ name: "", code_prefix: "", contact_name: "", contact_email: "", contact_phone: "", notes: "" });
    setDialogOpen(false);
    fetchStores();
  };

  const handleUpdateStore = async () => {
    if (!editingStore) return;

    const { error } = await supabase
      .from("partner_stores")
      .update({
        name: editingStore.name,
        code_prefix: editingStore.code_prefix.toUpperCase(),
        contact_name: editingStore.contact_name,
        contact_email: editingStore.contact_email,
        contact_phone: editingStore.contact_phone,
        notes: editingStore.notes,
      })
      .eq("id", editingStore.id);

    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
      return;
    }

    toast({ title: "Loja atualizada!" });
    setEditDialogOpen(false);
    setEditingStore(null);
    fetchStores();
    if (selectedStore?.id === editingStore.id) {
      setSelectedStore({ ...editingStore });
    }
  };

  const handleDeleteStore = async (id: string) => {
    const { error } = await supabase.from("partner_stores").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
      return;
    }
    toast({ title: "Loja excluída!" });
    fetchStores();
    if (selectedStore?.id === id) {
      setSelectedStore(null);
    }
  };

  const handleSelectStore = async (store: PartnerStore) => {
    setSelectedStore(store);
    await fetchStoreAuths(store.id);
  };

  const fetchCreditsHistory = async (storeId: string) => {
    try {
      const data = await fetchAllRows("partner_credits_history", "*", (q) => 
        q.eq("partner_store_id", storeId).order("created_at", { ascending: false })
      );
      setCreditsHistory(data || []);
    } catch (error) {
      toast({ title: "Erro ao carregar histórico", variant: "destructive" });
    }
  };

  const handleAddCredits = async () => {
    if (!selectedStore || creditFormData.amount === 0) {
      toast({ title: "Insira um valor válido", variant: "destructive" });
      return;
    }

    // Insert credit history record
    const { error: historyError } = await supabase
      .from("partner_credits_history")
      .insert({
        partner_store_id: selectedStore.id,
        amount: creditFormData.amount,
        description: creditFormData.description || null,
      });

    if (historyError) {
      toast({ title: "Erro ao registrar crédito", variant: "destructive" });
      return;
    }

    // Update store credits
    const newCredits = Number(selectedStore.credits) + creditFormData.amount;
    const { error: updateError } = await supabase
      .from("partner_stores")
      .update({ credits: newCredits })
      .eq("id", selectedStore.id);

    if (updateError) {
      toast({ title: "Erro ao atualizar créditos", variant: "destructive" });
      return;
    }

    toast({ 
      title: creditFormData.amount > 0 ? "Créditos adicionados!" : "Créditos removidos!",
    });
    
    setSelectedStore({ ...selectedStore, credits: newCredits });
    setCreditFormData({ amount: 0, description: "" });
    setCreditsDialogOpen(false);
    fetchStores();
  };

  const handleViewCreditsHistory = async () => {
    if (!selectedStore) return;
    await fetchCreditsHistory(selectedStore.id);
    setCreditsHistoryDialogOpen(true);
  };

  const handleCreateAuth = async () => {
    if (!selectedStore) return;

    // Generate code using the database function
    const { data: codeData, error: codeError } = await supabase
      .rpc("generate_partner_auth_code", { p_partner_id: selectedStore.id });

    if (codeError) {
      toast({ title: "Erro ao gerar código", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("authentications").insert({
      code: codeData,
      date: authFormData.date,
      requester_name: authFormData.requester_name,
      brand: authFormData.brand,
      item_name: authFormData.item_name,
      result: authFormData.result,
      item_category: authFormData.item_category,
      price: authFormData.price,
      partner_store_id: selectedStore.id,
    });

    if (error) {
      toast({ title: "Erro ao criar autenticação", variant: "destructive" });
      return;
    }

    toast({ title: "Autenticação criada com sucesso!" });
    setAuthDialogOpen(false);
    setAuthFormData({
      date: nowBrasiliaDatetimeLocal(),
      requester_name: "",
      brand: "",
      item_name: "",
      result: "AUTH",
      item_category: "roupa",
      price: 18,
    });
    fetchStoreAuths(selectedStore.id);
  };

  const handleEditAuth = (auth: Authentication) => {
    setEditingAuth({
      ...auth,
      date: auth.date.slice(0, 16),
    });
    setEditAuthDialogOpen(true);
  };

  const handleUpdateAuth = async () => {
    if (!editingAuth || !selectedStore) return;

    const { error } = await supabase
      .from("authentications")
      .update({
        date: editingAuth.date,
        requester_name: editingAuth.requester_name,
        brand: editingAuth.brand,
        item_name: editingAuth.item_name,
        result: editingAuth.result,
        item_category: editingAuth.item_category,
        price: editingAuth.price,
      })
      .eq("id", editingAuth.id);

    if (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
      return;
    }

    toast({ title: "Autenticação atualizada!" });
    setEditAuthDialogOpen(false);
    setEditingAuth(null);
    fetchStoreAuths(selectedStore.id);
  };

  const handleDeleteAuth = async (id: string) => {
    if (!selectedStore) return;

    const { error } = await supabase
      .from("authentications")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
      return;
    }

    toast({ title: "Autenticação excluída!" });
    fetchStoreAuths(selectedStore.id);
  };

  // Calculate metrics for selected store
  // Exclude CA-paid authentications from average ticket calculation
  const storeAuthsForTicket = storeAuths.filter(a => !a.paid_with_ca);
  const storeMetrics = {
    total: storeAuths.length,
    authCount: storeAuths.filter(a => a.result === "AUTH").length,
    replicaCount: storeAuths.filter(a => a.result === "RÉPLICA").length,
    totalRevenue: storeAuths.reduce((sum, a) => sum + Number(a.price), 0),
    avgTicket: storeAuthsForTicket.length > 0 
      ? storeAuthsForTicket.reduce((sum, a) => sum + Number(a.price), 0) / storeAuthsForTicket.length 
      : 0,
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
        {selectedStore ? (
          // Store Dashboard View
          <>
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                onClick={() => setSelectedStore(null)}
                className="border-border hover:bg-muted"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h2 className="font-serif text-3xl font-medium text-foreground">
                  {selectedStore.name}
                </h2>
                <p className="text-muted-foreground">Prefixo: #{selectedStore.code_prefix}</p>
              </div>
            </div>

            {/* Store Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <MetricCard
                title="Total de Autenticações"
                value={storeMetrics.total.toString()}
                subtitle="desta loja"
                icon={ShieldCheck}
                accent="volume"
              />
              <MetricCard
                title="Autênticos"
                value={storeMetrics.authCount.toString()}
                subtitle={`${storeMetrics.total > 0 ? ((storeMetrics.authCount / storeMetrics.total) * 100).toFixed(0) : 0}% do total`}
                icon={CheckCircle}
              />
              <MetricCard
                title="Faturamento Total"
                value={`R$ ${storeMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subtitle="receita da loja"
                icon={DollarSign}
                accent="revenue"
              />
              <MetricCard
                title="Ticket Médio"
                value={`R$ ${storeMetrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subtitle="por autenticação"
                icon={Receipt}
              />
              <MetricCard
                title="Créditos Disponíveis"
                value={`R$ ${Number(selectedStore.credits).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subtitle="saldo atual"
                icon={Wallet}
                accent="revenue"
              />
            </div>

            {/* Credits Management */}
            <Card className="bg-card border-border mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-foreground" />
                  Gerenciamento de Créditos
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleViewCreditsHistory}
                    className="border-border hover:bg-muted"
                  >
                    <History className="mr-2 h-4 w-4" />
                    Histórico
                  </Button>
                  <Dialog open={creditsDialogOpen} onOpenChange={setCreditsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Créditos
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Adicionar Créditos - {selectedStore.name}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Valor (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={creditFormData.amount}
                            onChange={(e) => setCreditFormData({ ...creditFormData, amount: Number(e.target.value) })}
                            placeholder="Ex: 100.00"
                            className="bg-background border-border"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use valores negativos para remover créditos
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Descrição (opcional)</Label>
                          <Input
                            value={creditFormData.description}
                            onChange={(e) => setCreditFormData({ ...creditFormData, description: e.target.value })}
                            placeholder="Ex: Pagamento via PIX"
                            className="bg-background border-border"
                          />
                        </div>
                        <div className="p-4 bg-background rounded-lg border border-border">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Saldo atual:</span>
                            <span className="text-foreground font-medium">
                              R$ {Number(selectedStore.credits).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-muted-foreground">Após transação:</span>
                            <span className={`font-bold ${(Number(selectedStore.credits) + creditFormData.amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              R$ {(Number(selectedStore.credits) + creditFormData.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleAddCredits} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                        Confirmar
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
            </Card>

            {/* Credits History Dialog */}
            <Dialog open={creditsHistoryDialogOpen} onOpenChange={setCreditsHistoryDialogOpen}>
              <DialogContent className="bg-card border-border max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Histórico de Créditos - {selectedStore.name}</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto">
                  {creditsHistory.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum registro de crédito</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-muted-foreground">Data</TableHead>
                          <TableHead className="text-muted-foreground">Valor</TableHead>
                          <TableHead className="text-muted-foreground">Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditsHistory.map((record) => (
                          <TableRow key={record.id} className="border-border">
                            <TableCell className="text-foreground">
                              {formatDateTimeBrasilia(new Date(record.created_at))}
                            </TableCell>
                            <TableCell className={`font-medium ${record.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {record.amount >= 0 ? '+' : ''}R$ {Number(record.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {record.description || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Store Authentications Table */}
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">Autenticações da Loja</CardTitle>
                <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Autenticação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Nova Autenticação - {selectedStore.name}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Data</Label>
                          <Input
                            type="datetime-local"
                            value={authFormData.date}
                            onChange={(e) => setAuthFormData({ ...authFormData, date: e.target.value })}
                            className="bg-background border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Solicitante</Label>
                          <Input
                            value={authFormData.requester_name}
                            onChange={(e) => setAuthFormData({ ...authFormData, requester_name: e.target.value })}
                            className="bg-background border-border"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Marca</Label>
                          <Input
                            value={authFormData.brand}
                            onChange={(e) => setAuthFormData({ ...authFormData, brand: e.target.value })}
                            className="bg-background border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Item</Label>
                          <Input
                            value={authFormData.item_name}
                            onChange={(e) => setAuthFormData({ ...authFormData, item_name: e.target.value })}
                            className="bg-background border-border"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Resultado</Label>
                          <select
                            value={authFormData.result}
                            onChange={(e) => setAuthFormData({ ...authFormData, result: e.target.value as "AUTH" | "RÉPLICA" })}
                            className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground"
                          >
                            <option value="AUTH">AUTH</option>
                            <option value="RÉPLICA">RÉPLICA</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Categoria</Label>
                          <select
                            value={authFormData.item_category}
                            onChange={(e) => {
                              const cat = e.target.value as "roupa" | "tenis_calcados" | "personalizado";
                              const price = cat === "roupa" ? 18 : cat === "tenis_calcados" ? 25 : authFormData.price;
                              setAuthFormData({ ...authFormData, item_category: cat, price });
                            }}
                            className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground"
                          >
                            <option value="roupa">Roupa</option>
                            <option value="tenis_calcados">Calçado</option>
                            <option value="personalizado">Personalizado</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Preço (R$)</Label>
                          <Input
                            type="number"
                            value={authFormData.price}
                            onChange={(e) => setAuthFormData({ ...authFormData, price: Number(e.target.value) })}
                            disabled={authFormData.item_category !== "personalizado"}
                            className="bg-background border-border"
                          />
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleCreateAuth} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                      Criar Autenticação
                    </Button>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {storeAuths.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma autenticação registrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Código</TableHead>
                        <TableHead className="text-muted-foreground">Data</TableHead>
                        <TableHead className="text-muted-foreground">Solicitante</TableHead>
                        <TableHead className="text-muted-foreground">Marca</TableHead>
                        <TableHead className="text-muted-foreground">Item</TableHead>
                        <TableHead className="text-muted-foreground">Resultado</TableHead>
                        <TableHead className="text-muted-foreground">Preço</TableHead>
                        <TableHead className="text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeAuths.map((auth) => (
                        <TableRow key={auth.id} className="border-border">
                          <TableCell className="font-mono text-foreground">{auth.code}</TableCell>
                          <TableCell className="text-foreground">
                            {new Date(auth.date).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-foreground">{auth.requester_name}</TableCell>
                          <TableCell className="text-foreground">{auth.brand}</TableCell>
                          <TableCell className="text-foreground">{auth.item_name}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              auth.result === "AUTH" 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              {auth.result}
                            </span>
                          </TableCell>
                          <TableCell className="text-foreground">
                            R$ {Number(auth.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditAuth(auth)}
                                className="hover:bg-muted"
                              >
                                <Pencil className="h-4 w-4 text-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteAuth(auth.id)}
                                className="hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Edit Authentication Dialog */}
            <Dialog open={editAuthDialogOpen} onOpenChange={setEditAuthDialogOpen}>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Editar Autenticação - {editingAuth?.code}</DialogTitle>
                </DialogHeader>
                {editingAuth && (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Data</Label>
                        <Input
                          type="datetime-local"
                          value={editingAuth.date}
                          onChange={(e) => setEditingAuth({ ...editingAuth, date: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Solicitante</Label>
                        <Input
                          value={editingAuth.requester_name}
                          onChange={(e) => setEditingAuth({ ...editingAuth, requester_name: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Marca</Label>
                        <Input
                          value={editingAuth.brand}
                          onChange={(e) => setEditingAuth({ ...editingAuth, brand: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Item</Label>
                        <Input
                          value={editingAuth.item_name}
                          onChange={(e) => setEditingAuth({ ...editingAuth, item_name: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Resultado</Label>
                        <select
                          value={editingAuth.result}
                          onChange={(e) => setEditingAuth({ ...editingAuth, result: e.target.value as "AUTH" | "RÉPLICA" })}
                          className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground"
                        >
                          <option value="AUTH">AUTH</option>
                          <option value="RÉPLICA">RÉPLICA</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Categoria</Label>
                        <select
                          value={editingAuth.item_category}
                          onChange={(e) => {
                            const cat = e.target.value as "roupa" | "tenis_calcados" | "personalizado";
                            const price = cat === "roupa" ? 18 : cat === "tenis_calcados" ? 25 : editingAuth.price;
                            setEditingAuth({ ...editingAuth, item_category: cat, price });
                          }}
                          className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground"
                        >
                          <option value="roupa">Roupa</option>
                          <option value="tenis_calcados">Calçado</option>
                          <option value="personalizado">Personalizado</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Preço (R$)</Label>
                        <Input
                          type="number"
                          value={editingAuth.price}
                          onChange={(e) => setEditingAuth({ ...editingAuth, price: Number(e.target.value) })}
                          disabled={editingAuth.item_category !== "personalizado"}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <Button onClick={handleUpdateAuth} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                  Salvar Alterações
                </Button>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          // Stores List View
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-3xl font-medium text-foreground">
                Lojas Parceiras
              </h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Loja
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Cadastrar Loja Parceira</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Nome da Loja *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Nike Store"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Prefixo do Código *</Label>
                        <Input
                          value={formData.code_prefix}
                          onChange={(e) => setFormData({ ...formData, code_prefix: e.target.value.toUpperCase() })}
                          placeholder="Ex: NIKE"
                          className="bg-background border-border uppercase"
                        />
                        <p className="text-xs text-muted-foreground">Código: #{formData.code_prefix || "XXX"}-0001</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Contato</Label>
                        <Input
                          value={formData.contact_name}
                          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                          placeholder="Nome do responsável"
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Email</Label>
                        <Input
                          type="email"
                          value={formData.contact_email}
                          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Telefone</Label>
                        <Input
                          value={formData.contact_phone}
                          onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Observações</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateStore} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                    Cadastrar Loja
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            {stores.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma loja parceira cadastrada</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Loja</TableHead>
                        <TableHead className="text-muted-foreground">Prefixo</TableHead>
                        <TableHead className="text-muted-foreground">Contato</TableHead>
                        <TableHead className="text-muted-foreground">Email</TableHead>
                        <TableHead className="text-muted-foreground">Telefone</TableHead>
                        <TableHead className="text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stores.map((store) => (
                        <TableRow key={store.id} className="border-border">
                          <TableCell className="font-medium text-foreground">{store.name}</TableCell>
                          <TableCell className="font-mono text-foreground">#{store.code_prefix}</TableCell>
                          <TableCell className="text-foreground">{store.contact_name || "-"}</TableCell>
                          <TableCell className="text-foreground">{store.contact_email || "-"}</TableCell>
                          <TableCell className="text-foreground">{store.contact_phone || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSelectStore(store)}
                                className="hover:bg-muted hover:text-foreground"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => { setEditingStore(store); setEditDialogOpen(true); }}
                                className="hover:bg-muted hover:text-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteStore(store.id)}
                                className="hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Editar Loja Parceira</DialogTitle>
                </DialogHeader>
                {editingStore && (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Nome da Loja</Label>
                        <Input
                          value={editingStore.name}
                          onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Prefixo do Código</Label>
                        <Input
                          value={editingStore.code_prefix}
                          onChange={(e) => setEditingStore({ ...editingStore, code_prefix: e.target.value.toUpperCase() })}
                          className="bg-background border-border uppercase"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Contato</Label>
                        <Input
                          value={editingStore.contact_name || ""}
                          onChange={(e) => setEditingStore({ ...editingStore, contact_name: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Email</Label>
                        <Input
                          value={editingStore.contact_email || ""}
                          onChange={(e) => setEditingStore({ ...editingStore, contact_email: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Telefone</Label>
                      <Input
                        value={editingStore.contact_phone || ""}
                        onChange={(e) => setEditingStore({ ...editingStore, contact_phone: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Observações</Label>
                      <Textarea
                        value={editingStore.notes || ""}
                        onChange={(e) => setEditingStore({ ...editingStore, notes: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                )}
                <Button onClick={handleUpdateStore} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                  Salvar Alterações
                </Button>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </div>
  );
};

export default Partners;