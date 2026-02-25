import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const date = parse(value, "yyyy-MM", new Date());

  const goBack = () => onChange(format(subMonths(date, 1), "yyyy-MM"));
  const goForward = () => onChange(format(addMonths(date, 1), "yyyy-MM"));

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[140px] text-center text-sm font-medium capitalize">
        {format(date, "MMMM yyyy", { locale: ptBR })}
      </span>
      <Button variant="ghost" size="icon" onClick={goForward} className="h-8 w-8">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
