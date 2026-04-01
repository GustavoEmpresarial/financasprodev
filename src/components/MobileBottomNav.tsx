import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, ArrowDownUp, Wallet, BarChart3, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CreditCard,
  Receipt,
  TrendingUp,
  Bitcoin,
  Gamepad2,
  Heart,
  Calculator,
  FileSpreadsheet,
  Target,
  Building2,
  RefreshCw,
} from "lucide-react";

const primaryItems = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Contas", url: "/accounts", icon: Building2 },
  { title: "Despesas", url: "/transactions", icon: ArrowDownUp },
  { title: "Análise", url: "/analytics", icon: BarChart3 },
];

const moreItems = [
  { title: "Ganhos", url: "/earnings", icon: Wallet },
  { title: "Investimentos", url: "/investments", icon: TrendingUp },
  { title: "Contas a Pagar", url: "/bills", icon: Receipt },
  { title: "Cartões", url: "/credit-cards", icon: CreditCard },
  { title: "Assinaturas", url: "/subscriptions", icon: RefreshCw },
  { title: "Metas", url: "/goals", icon: Target },
  { title: "Saúde Financeira", url: "/financial-health", icon: Heart },
  { title: "Criptomoedas", url: "/crypto", icon: Bitcoin },
  { title: "Invest. Alternativos", url: "/alt-investments", icon: Gamepad2 },
  { title: "Simulador", url: "/simulator", icon: Calculator },
  { title: "Importar CSV", url: "/import", icon: FileSpreadsheet },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (url: string) => location.pathname === url;
  const isMoreActive = moreItems.some((item) => isActive(item.url));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card/95 backdrop-blur-md lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {primaryItems.map((item) => (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-[10px] font-medium transition-colors",
              isActive(item.url)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive(item.url) && "stroke-[2.5]")} />
            <span>{item.title}</span>
          </Link>
        ))}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-[10px] font-medium transition-colors",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "stroke-[2.5]")} />
              <span>Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl px-2 pb-8">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-base">Menu</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map((item) => (
                <Link
                  key={item.url}
                  to={item.url}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl p-3 text-[11px] font-medium transition-colors",
                    isActive(item.url)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{item.title}</span>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
