import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { todayBrasiliaISO } from "@/lib/dateUtils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowLeft, Trash2, Upload, Pencil, Coins } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { QuickDateFilters } from "@/components/QuickDateFilters";
import { exportToCSV, handlePrint } from "@/lib/exportUtils";
import { Download, Printer } from "lucide-react";

type Authentication = {
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
};

const Authentications = () => {
  const [authentications, setAuthentications] = useState<Authentication[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<Authentication | null>(null);
  const [editPaidWithCA, setEditPaidWithCA] = useState(false);
  const [editOriginalPaidWithCA, setEditOriginalPaidWithCA] = useState(false);
  const [editCustomerCABalance, setEditCustomerCABalance] = useState(0);
  const [editCode, setEditCode] = useState("");
  const [editOriginalCode, setEditOriginalCode] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<{from: Date | null; to: Date | null}>({ from: null, to: null });

  // Autocomplete state
  const [allCustomerNames, setAllCustomerNames] = useState<string[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const requesterInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    date: todayBrasiliaISO(),
    requester_name: "",
    brand: "",
    item_name: "",
    result: "AUTH" as "AUTH" | "RÉPLICA",
    item_category: "roupa" as "roupa" | "tenis_calcados" | "personalizado",
    custom_price: "",
    use_ca_credit: false,
  });

  const [customerCABalance, setCustomerCABalance] = useState<number>(0);

  useEffect(() => {
    checkAuth();
    fetchAuthentications();
    fetchAllCustomerNames();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionRef.current && !suggestionRef.current.contains(e.target as Node) &&
        requesterInputRef.current && !requesterInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAllCustomerNames = async () => {
    const { data } = await supabase
      .from("customers")
      .select("name")
      .order("name", { ascending: true });
    if (data) {
      setAllCustomerNames(data.map((c) => c.name));
    }
  };



  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchAuthentications = async () => {
    try {
      const { data, error } = await supabase
        .from("authentications")
        .select("*")
        .order("code", { ascending: false });

      if (error) throw error;
      setAuthentications(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar autenticações",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (formData.item_category === "personalizado") {
      return parseFloat(formData.custom_price) || 0;
    }
    return formData.item_category === "tenis_calcados" ? 25 : 18;
  };

  const ensureCustomerExists = async (requesterName: string): Promise<string | null> => {
    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, ca_balance")
      .eq("name", requesterName)
      .maybeSingle();

    if (!existingCustomer) {
      // Create new customer
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({ name: requesterName })
        .select("id")
        .single();
      return newCustomer?.id || null;
    }
    return existingCustomer.id;
  };

  const deductCACredit = async (customerId: string, authCode: string): Promise<{ deducted: boolean; unitPrice: number }> => {
    // Get customer's current balance
    const { data: customer } = await supabase
      .from("customers")
      .select("ca_balance, name")
      .eq("id", customerId)
      .single();

    if (!customer || customer.ca_balance <= 0) {
      // No CA credits to deduct
      return { deducted: false, unitPrice: 0 };
    }

    // Deduct 1 CA from balance
    const newBalance = customer.ca_balance - 1;
    await supabase
      .from("customers")
      .update({ ca_balance: newBalance })
      .eq("id", customerId);

    // Find an active purchase to deduct from
    const { data: activePurchase } = await supabase
      .from("ca_purchases")
      .select("id, credits_remaining, price_paid, credits_purchased")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .gt("credits_remaining", 0)
      .order("expires_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // Calculate unit price based on the package
    let unitPrice = 0;
    if (activePurchase) {
      unitPrice = Number(activePurchase.price_paid) / activePurchase.credits_purchased;
      
      const newCreditsRemaining = activePurchase.credits_remaining - 1;
      await supabase
        .from("ca_purchases")
        .update({ 
          credits_remaining: newCreditsRemaining,
          status: newCreditsRemaining === 0 ? "consumed" : "active"
        })
        .eq("id", activePurchase.id);
    }

    // Create transaction record
    await supabase.from("ca_transactions").insert({
      customer_id: customerId,
      purchase_id: activePurchase?.id || null,
      type: "debit",
      credits: 1,
      description: `Autenticação ${authCode} - Débito automático`,
    });

    return { deducted: true, unitPrice };
  };

  const fetchCustomerCABalance = async (customerName: string) => {
    if (!customerName.trim()) {
      setCustomerCABalance(0);
      return;
    }

    const { data } = await supabase
      .from("customers")
      .select("ca_balance")
      .eq("name", customerName)
      .maybeSingle();

    setCustomerCABalance(data?.ca_balance || 0);
  };

  const handleRequesterNameChange = (value: string) => {
    setFormData({ ...formData, requester_name: value });
    // Update autocomplete suggestions
    if (value.trim().length > 0) {
      const filtered = allCustomerNames.filter((name) =>
        name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      setNameSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setNameSuggestions([]);
      setShowSuggestions(false);
    }
    setActiveSuggestionIndex(-1);
    // Debounce the fetch
    setTimeout(() => fetchCustomerCABalance(value), 300);
  };

  const selectSuggestion = (name: string) => {
    setFormData((prev) => ({ ...prev, requester_name: name }));
    setShowSuggestions(false);
    setNameSuggestions([]);
    setActiveSuggestionIndex(-1);
    setTimeout(() => fetchCustomerCABalance(name), 0);
  };

  const handleRequesterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || nameSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => Math.min(prev + 1, nameSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeSuggestionIndex >= 0) {
      e.preventDefault();
      selectSuggestion(nameSuggestions[activeSuggestionIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: codeData } = await supabase.rpc("generate_auth_code");
      const code = codeData || "#A0001";

      // Convert the date to ISO format at start of day in local timezone
      const selectedDate = new Date(formData.date + 'T00:00:00');
      
      // Calculate the regular price (based on category)
      const regularPrice = calculatePrice();
      
      // Auto-create customer in CRM if first authentication
      const customerId = await ensureCustomerExists(formData.requester_name);
      
      let finalPrice = regularPrice;
      let wasPaidWithCA = false;
      
      // Deduct CA credit and get unit price if paying with CA or if customer has balance
      if (customerId) {
        const result = await deductCACredit(customerId, code);
        if (result.deducted) {
          wasPaidWithCA = true;
          // Use the unit price from the package if available, otherwise use regular price
          finalPrice = result.unitPrice > 0 ? result.unitPrice : regularPrice;
        }
      }
      
      const { error } = await supabase.from("authentications").insert({
        code,
        date: selectedDate.toISOString(),
        requester_name: formData.requester_name,
        brand: formData.brand,
        item_name: formData.item_name,
        result: formData.result,
        item_category: formData.item_category,
        price: finalPrice,
        paid_with_ca: wasPaidWithCA,
      });

      if (error) throw error;

      if (wasPaidWithCA) {
        toast({
          title: "Autenticação adicionada!",
          description: `Código ${code} criado. Pago com 1 CA (R$ ${finalPrice.toFixed(2)}).`,
        });
      } else {
        toast({
          title: "Autenticação adicionada!",
          description: `Código ${code} criado com sucesso`,
        });
      }

      setOpen(false);
      setFormData({
        date: todayBrasiliaISO(),
        requester_name: "",
        brand: "",
        item_name: "",
        result: "AUTH",
        item_category: "roupa",
        custom_price: "",
        use_ca_credit: false,
      });
      setCustomerCABalance(0);
      fetchAuthentications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (auth: Authentication) => {
    setEditingAuth(auth);
    setEditCode(auth.code);
    setEditOriginalCode(auth.code);
    
    // Check if this authentication was paid with CA using the paid_with_ca field
    const wasPaidWithCA = auth.paid_with_ca;
    setEditPaidWithCA(wasPaidWithCA);
    setEditOriginalPaidWithCA(wasPaidWithCA);
    
    // Fetch customer CA balance for editing
    const { data } = await supabase
      .from("customers")
      .select("ca_balance")
      .eq("name", auth.requester_name)
      .maybeSingle();
    
    setEditCustomerCABalance(data?.ca_balance || 0);
    setEditOpen(true);
  };

  const updateSubsequentCodes = async (oldCode: string, newCode: string) => {
    // Parse the numeric part from codes like #A0001
    const parseCodeNumber = (code: string): number => {
      const match = code.match(/#A(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    
    const formatCode = (num: number): string => {
      return `#A${num.toString().padStart(4, '0')}`;
    };
    
    const oldNum = parseCodeNumber(oldCode);
    const newNum = parseCodeNumber(newCode);
    
    if (oldNum === newNum || oldNum === 0 || newNum === 0) return;
    
    // Get all authentications that need to be updated
    const { data: allAuths } = await supabase
      .from("authentications")
      .select("id, code")
      .order("code", { ascending: true });
    
    if (!allAuths) return;
    
    const diff = newNum - oldNum;
    
    // Find codes that need adjustment
    const authsToUpdate = allAuths.filter(auth => {
      const authNum = parseCodeNumber(auth.code);
      if (diff > 0) {
        // If new code is larger, shift codes between old+1 and new down by 1
        return authNum > oldNum && authNum <= newNum;
      } else {
        // If new code is smaller, shift codes between new and old-1 up by 1
        return authNum >= newNum && authNum < oldNum;
      }
    });
    
    // Update each authentication's code
    for (const auth of authsToUpdate) {
      const authNum = parseCodeNumber(auth.code);
      const updatedNum = diff > 0 ? authNum - 1 : authNum + 1;
      const updatedCode = formatCode(updatedNum);
      
      await supabase
        .from("authentications")
        .update({ code: updatedCode })
        .eq("id", auth.id);
    }
  };

  const restoreCACredit = async (customerName: string, authCode: string) => {
    // Get customer
    const { data: customer } = await supabase
      .from("customers")
      .select("id, ca_balance")
      .eq("name", customerName)
      .maybeSingle();

    if (!customer) return false;

    // Restore 1 CA to balance
    const newBalance = customer.ca_balance + 1;
    await supabase
      .from("customers")
      .update({ ca_balance: newBalance })
      .eq("id", customer.id);

    // Find the most recent active or consumed purchase to restore credits to
    const { data: purchase } = await supabase
      .from("ca_purchases")
      .select("id, credits_remaining")
      .eq("customer_id", customer.id)
      .in("status", ["active", "consumed"])
      .order("expires_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (purchase) {
      await supabase
        .from("ca_purchases")
        .update({ 
          credits_remaining: purchase.credits_remaining + 1,
          status: "active"
        })
        .eq("id", purchase.id);
    }

    // Create refund transaction record
    await supabase.from("ca_transactions").insert({
      customer_id: customer.id,
      purchase_id: purchase?.id || null,
      type: "refund",
      credits: 1,
      description: `Autenticação ${authCode} - Estorno de CA (edição)`,
    });

    return true;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAuth) return;
    setLoading(true);

    try {
      const selectedDate = new Date(editingAuth.date.split('T')[0] + 'T00:00:00');
      
      // Check if code was changed
      const codeChanged = editCode !== editOriginalCode;
      if (codeChanged) {
        await updateSubsequentCodes(editOriginalCode, editCode);
      }
      const customerId = await ensureCustomerExists(editingAuth.requester_name);
      
      let finalPrice = editingAuth.price;
      
      // Handle CA credit changes
      if (customerId) {
        // If changed from NOT paid with CA to paid with CA -> deduct and get unit price
        if (!editOriginalPaidWithCA && editPaidWithCA) {
          const result = await deductCACredit(customerId, editingAuth.code);
          if (result.deducted && result.unitPrice > 0) {
            finalPrice = result.unitPrice;
          }
          
          const { error } = await supabase
            .from("authentications")
            .update({
              code: editCode,
              date: selectedDate.toISOString(),
              requester_name: editingAuth.requester_name,
              brand: editingAuth.brand,
              item_name: editingAuth.item_name,
              result: editingAuth.result,
              item_category: editingAuth.item_category,
              price: finalPrice,
              paid_with_ca: true,
            })
            .eq("id", editingAuth.id);

          if (error) throw error;
          
          toast({
            title: "Autenticação atualizada!",
            description: `Código ${editingAuth.code} atualizado. 1 CA deduzido (R$ ${finalPrice.toFixed(2)}).`,
          });
        }
        // If changed from paid with CA to NOT paid with CA -> restore
        else if (editOriginalPaidWithCA && !editPaidWithCA) {
          await restoreCACredit(editingAuth.requester_name, editingAuth.code);
          
          const { error } = await supabase
            .from("authentications")
            .update({
              code: editCode,
              date: selectedDate.toISOString(),
              requester_name: editingAuth.requester_name,
              brand: editingAuth.brand,
              item_name: editingAuth.item_name,
              result: editingAuth.result,
              item_category: editingAuth.item_category,
              price: editingAuth.price,
              paid_with_ca: false,
            })
            .eq("id", editingAuth.id);

          if (error) throw error;
          
          toast({
            title: "Autenticação atualizada!",
            description: `Código ${editingAuth.code} atualizado. 1 CA restaurado.`,
          });
        }
        else {
          const { error } = await supabase
            .from("authentications")
            .update({
              code: editCode,
              date: selectedDate.toISOString(),
              requester_name: editingAuth.requester_name,
              brand: editingAuth.brand,
              item_name: editingAuth.item_name,
              result: editingAuth.result,
              item_category: editingAuth.item_category,
              price: editingAuth.price,
              paid_with_ca: editPaidWithCA,
            })
            .eq("id", editingAuth.id);

          if (error) throw error;
          
          toast({
            title: "Autenticação atualizada!",
            description: `Código ${editingAuth.code} atualizado com sucesso`,
          });
        }
      } else {
        const { error } = await supabase
          .from("authentications")
          .update({
            code: editCode,
            date: selectedDate.toISOString(),
            requester_name: editingAuth.requester_name,
            brand: editingAuth.brand,
            item_name: editingAuth.item_name,
            result: editingAuth.result,
            item_category: editingAuth.item_category,
            price: editingAuth.price,
            paid_with_ca: editPaidWithCA,
          })
          .eq("id", editingAuth.id);

        if (error) throw error;
        
        toast({
          title: "Autenticação atualizada!",
          description: `Código ${editingAuth.code} atualizado com sucesso`,
        });
      }

      setEditOpen(false);
      setEditingAuth(null);
      setEditPaidWithCA(false);
      setEditOriginalPaidWithCA(false);
      setEditCustomerCABalance(0);
      setEditCode("");
      setEditOriginalCode("");
      fetchAuthentications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("authentications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Autenticação removida",
      });
      fetchAuthentications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: error.message,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (!Array.isArray(json)) {
          throw new Error("O arquivo deve conter um array de objetos");
        }

        // Limit import size for security
        if (json.length > 500) {
          throw new Error("Máximo de 500 registros por importação");
        }

        // Sanitize and validate data
        const sanitizeString = (str: unknown, maxLength: number = 100): string => {
          if (typeof str !== 'string') return '';
          return str.trim().slice(0, maxLength);
        };

        const validData = json.map((item, index) => {
          const requesterName = sanitizeString(item.requester_name, 100);
          const brand = sanitizeString(item.brand, 100);
          const itemName = sanitizeString(item.item_name, 200);

          if (!requesterName || !brand || !itemName) {
            throw new Error(`Item ${index + 1}: campos obrigatórios faltando ou vazios (requester_name, brand, item_name)`);
          }

          // Validate date format
          const dateStr = sanitizeString(item.date, 10);
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          const validDate = dateRegex.test(dateStr) ? dateStr : todayBrasiliaISO();

          // Validate and sanitize category
          const validCategories = ["roupa", "tenis_calcados", "personalizado"] as const;
          const category = validCategories.includes(item.item_category) 
            ? item.item_category 
            : "roupa";

          // Validate price
          const price = typeof item.price === 'number' && item.price >= 0 && item.price <= 10000
            ? item.price 
            : (category === "tenis_calcados" ? 25 : 18);
          
          return {
            date: validDate,
            requester_name: requesterName,
            brand: brand,
            item_name: itemName,
            result: item.result === "RÉPLICA" ? "RÉPLICA" as const : "AUTH" as const,
            item_category: category,
            price: price,
          };
        });

        setImportData(validData);
        toast({
          title: "Arquivo carregado",
          description: `${validData.length} registros validados e prontos para importar`,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        toast({
          variant: "destructive",
          title: "Erro ao ler arquivo",
          description: errorMessage,
        });
        setImportFile(null);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (importData.length === 0) return;
    
    setLoading(true);
    let deductedCount = 0;
    
    try {
      // Collect unique requester names and create a map of name -> id
      const customerIdMap = new Map<string, string>();
      const uniqueRequesters = [...new Set(importData.map(item => item.requester_name))];
      
      // Ensure all customers exist in CRM and collect their IDs
      for (const requesterName of uniqueRequesters) {
        const customerId = await ensureCustomerExists(requesterName);
        if (customerId) {
          customerIdMap.set(requesterName, customerId);
        }
      }

      // Import all records
      for (const item of importData) {
        const { data: codeData } = await supabase.rpc("generate_auth_code");
        const code = codeData || "#A0001";
        
        const selectedDate = new Date(item.date + 'T00:00:00');
        
        await supabase.from("authentications").insert({
          code,
          date: selectedDate.toISOString(),
          requester_name: item.requester_name,
          brand: item.brand,
          item_name: item.item_name,
          result: item.result,
          item_category: item.item_category,
          price: item.price,
        });

        // Deduct 1 CA from customer if they have credits
        const customerId = customerIdMap.get(item.requester_name);
        if (customerId) {
          const deducted = await deductCACredit(customerId, code);
          if (deducted) deductedCount++;
        }
      }

      const deductMessage = deductedCount > 0 
        ? ` ${deductedCount} CA deduzidos automaticamente.`
        : "";

      toast({
        title: "Importação concluída!",
        description: `${importData.length} autenticações importadas com sucesso.${deductMessage}`,
      });

      setImportOpen(false);
      setImportData([]);
      setImportFile(null);
      fetchAuthentications();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAuths = authentications.filter(auth => {
    if (!dateRange.from || !dateRange.to) return true;
    const authDate = new Date(auth.date);
    const compareDate = new Date(authDate.getFullYear(), authDate.getMonth(), authDate.getDate());
    const fromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
    const toDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
    return compareDate >= fromDate && compareDate <= toDate;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <DashboardHeader />

      <main className="container mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/")}
              className="border-border"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-serif text-3xl font-medium text-foreground">
              Gerenciar Autenticações
            </h1>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="border-border hidden md:flex" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" className="border-border hidden md:flex" onClick={() => exportToCSV(filteredAuths, `autenticacoes-${new Date().toISOString().split('T')[0]}.csv`)}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border hidden md:flex">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar JSON
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importar Autenticações via JSON</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="json-file">Arquivo JSON</Label>
                    <Input
                      id="json-file"
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Formato esperado: array de objetos com campos requester_name, brand, item_name, result, item_category, price, date
                    </p>
                  </div>

                  {importData.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">
                        Preview ({importData.length} registros)
                      </h3>
                      <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Solicitante</TableHead>
                              <TableHead>Marca</TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead>Resultado</TableHead>
                              <TableHead>Preço</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importData.slice(0, 10).map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{new Date(item.date).toLocaleDateString("pt-BR")}</TableCell>
                                <TableCell>{item.requester_name}</TableCell>
                                <TableCell>{item.brand}</TableCell>
                                <TableCell>{item.item_name}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    item.result === "AUTH" ? "bg-muted text-foreground" : "bg-destructive/20 text-destructive"
                                  }`}>
                                    {item.result}
                                  </span>
                                </TableCell>
                                <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {importData.length > 10 && (
                          <p className="text-sm text-muted-foreground p-2">
                            ... e mais {importData.length - 10} registros
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setImportOpen(false);
                        setImportData([]);
                        setImportFile(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={loading || importData.length === 0}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Importar {importData.length} Registros
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Autenticação
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Autenticação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="relative">
                    <Label htmlFor="requester">Nome do Solicitante</Label>
                    <Input
                      id="requester"
                      ref={requesterInputRef}
                      value={formData.requester_name}
                      onChange={(e) => handleRequesterNameChange(e.target.value)}
                      onKeyDown={handleRequesterKeyDown}
                      onFocus={() => {
                        if (nameSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      autoComplete="off"
                      required
                    />
                    {showSuggestions && nameSuggestions.length > 0 && (
                      <div
                        ref={suggestionRef}
                        className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden"
                      >
                        {nameSuggestions.map((name, idx) => (
                          <div
                            key={name}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSuggestion(name);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                              idx === activeSuggestionIndex
                                ? "bg-primary text-primary-foreground"
                                : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                    {customerCABalance > 0 && (
                      <p className="text-xs text-foreground mt-1 flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        Saldo CA: {customerCABalance} créditos
                      </p>
                    )}
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({ ...formData, brand: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="item">Item</Label>
                    <Input
                      id="item"
                      value={formData.item_name}
                      onChange={(e) =>
                        setFormData({ ...formData, item_name: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="result">Resultado</Label>
                    <Select
                      value={formData.result}
                      onValueChange={(value: "AUTH" | "RÉPLICA") =>
                        setFormData({ ...formData, result: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUTH">AUTH</SelectItem>
                        <SelectItem value="RÉPLICA">RÉPLICA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.item_category}
                      onValueChange={(
                        value: "roupa" | "tenis_calcados" | "personalizado"
                      ) => setFormData({ ...formData, item_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roupa">
                          Roupa (R$ 18,00)
                        </SelectItem>
                        <SelectItem value="tenis_calcados">
                          Tênis/Calçados (R$ 25,00)
                        </SelectItem>
                        <SelectItem value="personalizado">
                          Preço Personalizado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.item_category === "personalizado" && (
                  <div>
                    <Label htmlFor="custom_price">Preço Personalizado (R$)</Label>
                    <Input
                      id="custom_price"
                      type="number"
                      step="0.01"
                      value={formData.custom_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          custom_price: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                )}

                {/* CA Credit Payment Option */}
                {customerCABalance > 0 && (
                  <Card className="p-4 bg-muted border-border">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="use_ca_credit"
                        checked={formData.use_ca_credit}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, use_ca_credit: checked === true })
                        }
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="use_ca_credit"
                          className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
                        >
                          <Coins className="h-4 w-4" />
                          Pagar com Crédito CA
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Cliente possui {customerCABalance} CA disponíveis. Será deduzido 1 CA.
                        </p>
                      </div>
                      {formData.use_ca_credit && (
                        <span className="text-green-400 font-semibold text-sm">
                          R$ 0,00
                        </span>
                      )}
                    </div>
                  </Card>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Adicionar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="mb-4">
          <QuickDateFilters onSelectRange={setDateRange} />
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : authentications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma autenticação cadastrada ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuths.map((auth) => (
                  <TableRow key={auth.id}>
                    <TableCell className="font-mono text-foreground">
                      {auth.code}
                    </TableCell>
                    <TableCell>
                      {new Date(auth.date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{auth.requester_name}</TableCell>
                    <TableCell>{auth.brand}</TableCell>
                    <TableCell>{auth.item_name}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          auth.result === "AUTH"
                            ? "bg-muted text-foreground"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {auth.result}
                      </span>
                    </TableCell>
                    <TableCell>R$ {auth.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(auth)}
                          className="text-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(auth.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Autenticação</DialogTitle>
            </DialogHeader>
            {editingAuth && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-code">Código</Label>
                    <Input
                      id="edit-code"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      placeholder="#A0001"
                      required
                    />
                    {editCode !== editOriginalCode && (
                      <p className="text-xs text-amber-500 mt-1">
                        ⚠️ Alterar o código irá reordenar os códigos seguintes
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="edit-date">Data</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editingAuth.date.split('T')[0]}
                      onChange={(e) =>
                        setEditingAuth({ ...editingAuth, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-requester">Nome do Solicitante</Label>
                    <Input
                      id="edit-requester"
                      value={editingAuth.requester_name}
                      onChange={(e) =>
                        setEditingAuth({
                          ...editingAuth,
                          requester_name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-brand">Marca</Label>
                    <Input
                      id="edit-brand"
                      value={editingAuth.brand}
                      onChange={(e) =>
                        setEditingAuth({ ...editingAuth, brand: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-item">Item</Label>
                    <Input
                      id="edit-item"
                      value={editingAuth.item_name}
                      onChange={(e) =>
                        setEditingAuth({ ...editingAuth, item_name: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-result">Resultado</Label>
                    <Select
                      value={editingAuth.result}
                      onValueChange={(value: "AUTH" | "RÉPLICA") =>
                        setEditingAuth({ ...editingAuth, result: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUTH">AUTH</SelectItem>
                        <SelectItem value="RÉPLICA">RÉPLICA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Categoria</Label>
                    <Select
                      value={editingAuth.item_category}
                      onValueChange={(
                        value: "roupa" | "tenis_calcados" | "personalizado"
                      ) => setEditingAuth({ ...editingAuth, item_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roupa">Roupa</SelectItem>
                        <SelectItem value="tenis_calcados">Tênis/Calçados</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-price">Preço (R$)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={editPaidWithCA ? 0 : editingAuth.price}
                    onChange={(e) =>
                      setEditingAuth({
                        ...editingAuth,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={editPaidWithCA}
                    required
                  />
                </div>

                {/* CA Credit Payment Option for Edit */}
                <Card className="p-4 bg-muted border-border">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="edit_use_ca_credit"
                      checked={editPaidWithCA}
                      onCheckedChange={(checked) => setEditPaidWithCA(checked === true)}
                      disabled={!editOriginalPaidWithCA && editCustomerCABalance <= 0}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="edit_use_ca_credit"
                        className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
                      >
                        <Coins className="h-4 w-4" />
                        Pago com Crédito CA
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {editOriginalPaidWithCA 
                          ? "Esta autenticação foi paga com CA. Desmarcar irá restaurar 1 CA."
                          : editCustomerCABalance > 0 
                            ? `Cliente possui ${editCustomerCABalance} CA disponíveis. Marcar irá deduzir 1 CA.`
                            : "Cliente não possui CA disponíveis."}
                      </p>
                    </div>
                    {editPaidWithCA && (
                      <span className="text-green-400 font-semibold text-sm">
                        R$ 0,00
                      </span>
                    )}
                  </div>
                </Card>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditOpen(false);
                      setEditingAuth(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Authentications;
