import { AlertTriangle, Clock, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { nowBrasilia } from "@/lib/dateUtils";

interface CAPurchase {
  id: string;
  customer_id: string;
  credits_remaining: number;
  credits_purchased: number;
  expires_at: string;
  status: string;
  customer?: { id: string; name: string; ca_balance: number };
  package?: { id: string; name: string; credits: number; price: number; is_active: boolean };
}

interface CAExpirationAlertsProps {
  purchases: CAPurchase[];
}

const CAExpirationAlerts = ({ purchases }: CAExpirationAlertsProps) => {
  const now = nowBrasilia();

  const expiringPurchases = purchases
    .filter((p) => {
      if (p.status !== "active" || p.credits_remaining <= 0) return false;
      const daysLeft = differenceInDays(new Date(p.expires_at), now);
      return daysLeft >= 0 && daysLeft <= 7;
    })
    .map((p) => ({
      ...p,
      daysLeft: differenceInDays(new Date(p.expires_at), now),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (expiringPurchases.length === 0) return null;

  const criticalCount = expiringPurchases.filter((p) => p.daysLeft <= 2).length;
  const warningCount = expiringPurchases.filter((p) => p.daysLeft > 2).length;

  return (
    <div className="space-y-3 mb-6">
      {/* Summary banner */}
      <Alert className="border-orange-500/50 bg-orange-500/10">
        <AlertTriangle className="h-5 w-5 text-orange-400" />
        <AlertTitle className="text-orange-300 font-semibold">
          {expiringPurchases.length} pacote{expiringPurchases.length > 1 ? "s" : ""} CA próximo{expiringPurchases.length > 1 ? "s" : ""} do vencimento
        </AlertTitle>
        <AlertDescription className="text-orange-300/80">
          {criticalCount > 0 && (
            <span className="font-medium text-red-400">{criticalCount} crítico{criticalCount > 1 ? "s" : ""} (1-2 dias)</span>
          )}
          {criticalCount > 0 && warningCount > 0 && " · "}
          {warningCount > 0 && (
            <span>{warningCount} em atenção (3-7 dias)</span>
          )}
        </AlertDescription>
      </Alert>

      {/* Individual alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {expiringPurchases.map((purchase) => {
          const isCritical = purchase.daysLeft <= 2;
          const borderColor = isCritical ? "border-red-500/50" : "border-yellow-500/40";
          const bgColor = isCritical ? "bg-red-500/10" : "bg-yellow-500/10";
          const textColor = isCritical ? "text-red-400" : "text-yellow-400";
          const badgeBg = isCritical
            ? "bg-red-500/20 text-red-300 border-red-500/30"
            : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";

          return (
            <div
              key={purchase.id}
              className={`rounded-lg border p-4 ${borderColor} ${bgColor} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className={`h-4 w-4 ${textColor}`} />
                  <span className="font-semibold text-foreground text-sm">
                    {purchase.customer?.name || "Cliente desconhecido"}
                  </span>
                </div>
                <Badge className={badgeBg}>
                  {purchase.daysLeft === 0
                    ? "Hoje"
                    : purchase.daysLeft === 1
                      ? "1 dia"
                      : `${purchase.daysLeft} dias`}
                </Badge>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>
                    Vence em{" "}
                    {format(new Date(purchase.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    {purchase.credits_remaining}/{purchase.credits_purchased} créditos restantes
                  </span>
                  {purchase.package && (
                    <span className="text-muted-foreground/70">{purchase.package.name}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CAExpirationAlerts;
