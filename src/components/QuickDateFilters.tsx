import { Button } from "@/components/ui/button";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

interface QuickDateFiltersProps {
  onSelectRange: (range: { from: Date; to: Date }) => void;
}

export function QuickDateFilters({ onSelectRange }: QuickDateFiltersProps) {
  const today = new Date();

  const handleSelect = (preset: string) => {
    let from, to;

    switch (preset) {
      case "hoje":
        from = today;
        to = today;
        break;
      case "7dias":
        from = subDays(today, 6);
        to = today;
        break;
      case "30dias":
        from = subDays(today, 29);
        to = today;
        break;
      case "mesAtual":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "mesPassado":
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case "anoAtual":
        from = startOfYear(today);
        to = endOfYear(today);
        break;
      default:
        return;
    }

    onSelectRange({ from, to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center text-sm text-muted-foreground mr-2">
        <CalendarIcon className="h-4 w-4 mr-1.5" />
        Filtros Rápidos:
      </div>
      <Button variant="outline" size="sm" onClick={() => handleSelect("hoje")} className="h-8 text-xs px-3">
        Hoje
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleSelect("7dias")} className="h-8 text-xs px-3">
        Últimos 7 dias
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleSelect("30dias")} className="h-8 text-xs px-3">
        Últimos 30 dias
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleSelect("mesAtual")} className="h-8 text-xs px-3">
        Este Mês
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleSelect("mesPassado")} className="h-8 text-xs px-3">
        Mês Passado
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleSelect("anoAtual")} className="h-8 text-xs px-3 hidden sm:inline-flex">
        Este Ano
      </Button>
    </div>
  );
}
