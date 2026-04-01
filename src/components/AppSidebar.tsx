import { LayoutDashboard, ArrowDownUp, Wallet, Target, LogOut, CreditCard, Receipt, TrendingUp, Bitcoin, BarChart3, Calculator, Heart, FileSpreadsheet, Gamepad2, Building2, RefreshCw, ArrowRightLeft } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Contas", url: "/accounts", icon: Building2 },
  { title: "Despesas", url: "/transactions", icon: ArrowDownUp },
  { title: "Registrar Ganhos", url: "/earnings", icon: Wallet },
  { title: "Investimentos", url: "/investments", icon: TrendingUp },
  { title: "Contas a Pagar", url: "/bills", icon: Receipt },
  { title: "Cartões", url: "/credit-cards", icon: CreditCard },
  { title: "Assinaturas", url: "/subscriptions", icon: RefreshCw },
];

const analysisItems = [
  { title: "Painel Analítico", url: "/analytics", icon: BarChart3 },
  { title: "Saúde Financeira", url: "/financial-health", icon: Heart },
  { title: "Metas Financeiras", url: "/goals", icon: Target },
  { title: "Simulador", url: "/simulator", icon: Calculator },
];

const otherItems = [
  { title: "Criptomoedas", url: "/crypto", icon: Bitcoin },
  { title: "Invest. Alternativos", url: "/alt-investments", icon: Gamepad2 },
  { title: "Importar CSV", url: "/import", icon: FileSpreadsheet },
];

function NavGroup({ label, items }: { label: string; items: typeof mainItems }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-muted px-3 mb-1">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { signOut, user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary">
            <Wallet className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">FinançasPro</p>
            <p className="text-xs text-sidebar-muted">Finanças pessoais</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Principal" items={mainItems} />
        <NavGroup label="Análise & Metas" items={analysisItems} />
        <NavGroup label="Outros" items={otherItems} />
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="mb-3 rounded-lg bg-sidebar-accent px-3 py-2">
          <p className="truncate text-xs text-sidebar-muted">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
