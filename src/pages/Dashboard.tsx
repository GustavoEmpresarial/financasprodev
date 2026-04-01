import { useState } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Building2, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthPicker } from "@/components/MonthPicker";
import { useTransactions } from "@/hooks/useTransactions";
import { useEarnings } from "@/hooks/useEarnings";
import { useAccounts } from "@/hooks/useAccounts";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useInvestments } from "@/hooks/useInvestments";
import { useCrypto } from "@/hooks/useCrypto";
import { useAltInvestments } from "@/hooks/useAltInvestments";
import { useCreditCards } from "@/hooks/useCreditCards";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [] } = useTransactions(month);
  const { data: earnings = [] } = useEarnings(month);
  const { data: accounts = [] } = useAccounts();
  const { data: subs = [] } = useSubscriptions();
  const { data: investments = [] } = useInvestments();
  const { data: cryptoHoldings = [], livePrices } = useCrypto();
  const { investments: altInvs = [] } = useAltInvestments();
  const { data: cards = [] } = useCreditCards();

  const income = earnings.filter((e) => e.currency === "BRL").reduce((sum, e) => sum + e.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenses;

  // Net worth
  const accountsBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const investmentTotal = investments.reduce((s, i) => s + i.current_value, 0);
  const altTotal = altInvs.reduce((s, i) => s + i.invested_amount, 0);
  const getPrice = (symbol: string) => livePrices.data?.[symbol.toLowerCase()]?.brl || 0;
  const cryptoTotal = cryptoHoldings.reduce((s, h) => s + h.quantity * (getPrice(h.symbol) || h.current_price), 0);
  const cardDebt = cards.reduce((s, c) => {
    const used = transactions.filter((t: any) => t.type === "expense" && t.credit_card_id === c.id).reduce((sum: number, t: any) => sum + t.amount, 0);
    return s + used;
  }, 0);
  const netWorth = accountsBalance + investmentTotal + altTotal + cryptoTotal - cardDebt;

  // Monthly subscriptions cost
  const activeSubs = subs.filter(s => s.is_active);
  const monthlySubsCost = activeSubs.reduce((sum, s) => {
    if (s.frequency === "weekly") return sum + s.amount * 4;
    if (s.frequency === "quarterly") return sum + s.amount / 3;
    if (s.frequency === "yearly") return sum + s.amount / 12;
    return sum + s.amount;
  }, 0);

  // Category breakdown
  const categoryMap = new Map<string, { name: string; value: number; color: string }>();
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    const name = t.categories?.name || "Outros";
    const color = t.categories?.color || "#6b7280";
    const existing = categoryMap.get(name);
    if (existing) existing.value += t.amount;
    else categoryMap.set(name, { name, value: t.amount, color });
  });
  const pieData = Array.from(categoryMap.values());

  const barData = [
    { name: "Receitas", valor: income },
    { name: "Despesas", valor: expenses },
  ];

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Insights
  const insights: { type: "warning" | "success" | "info"; message: string }[] = [];
  if (expenses > income && income > 0) insights.push({ type: "warning", message: `Despesas excedem receitas em ${formatCurrency(expenses - income)}` });
  if (cardDebt > 0) {
    const totalLimit = cards.reduce((s, c) => s + c.total_limit, 0);
    const usePct = totalLimit > 0 ? (cardDebt / totalLimit) * 100 : 0;
    if (usePct > 70) insights.push({ type: "warning", message: `Uso de ${usePct.toFixed(0)}% do limite dos cartões` });
  }
  if (balance > 0 && income > 0) {
    const savingsRate = (balance / income) * 100;
    if (savingsRate > 30) insights.push({ type: "success", message: `Excelente! Você economizou ${savingsRate.toFixed(0)}% da renda` });
  }
  if (monthlySubsCost > 0) insights.push({ type: "info", message: `Assinaturas: ${formatCurrency(monthlySubsCost)}/mês (${activeSubs.length} ativas)` });

  // Recent activity
  const recentExpenses = transactions.filter((t) => t.type === "expense").slice(0, 5).map((t) => ({
    id: t.id, type: "expense" as const, label: t.categories?.name || "Sem categoria",
    description: t.description || format(new Date(t.date + "T12:00:00"), "dd/MM/yyyy"), amount: t.amount, date: t.date,
  }));
  const recentEarnings = earnings.slice(0, 5).map((e) => ({
    id: e.id, type: "income" as const, label: e.source_name,
    description: e.description || format(new Date(e.date + "T12:00:00"), "dd/MM/yyyy"), amount: e.amount, date: e.date,
  }));
  const recentAll = [...recentExpenses, ...recentEarnings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="border-muted">
          <CardContent className="py-3 space-y-1">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {ins.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                {ins.type === "success" && <TrendingUp className="h-4 w-4 text-income flex-shrink-0" />}
                {ins.type === "info" && <RefreshCw className="h-4 w-4 text-primary flex-shrink-0" />}
                <span className="text-muted-foreground">{ins.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio Líquido</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netWorth >= 0 ? "text-primary" : "text-expense"}`}>{formatCurrency(netWorth)}</p>
            <p className="text-xs text-muted-foreground mt-1">Contas + Invest. - Dívidas</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo do Mês</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${balance >= 0 ? "text-income" : "text-expense"}`}>{formatCurrency(balance)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(income)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-expense">{formatCurrency(expenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base font-semibold">Receitas vs Despesas</CardTitle></CardHeader>
          <CardContent>
            {income === 0 && expenses === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma movimentação neste mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    <Cell fill="hsl(var(--income))" />
                    <Cell fill="hsl(var(--expense))" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base font-semibold">Gastos por Categoria</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma despesa neste mês</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 text-xs">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="ml-auto font-medium">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patrimony breakdown */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base font-semibold">Composição do Patrimônio</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Contas", value: accountsBalance, color: "hsl(162, 63%, 41%)" },
              { label: "Invest. Tradicionais", value: investmentTotal, color: "hsl(199, 89%, 48%)" },
              { label: "Invest. Alternativos", value: altTotal, color: "hsl(262, 80%, 50%)" },
              { label: "Criptomoedas", value: cryptoTotal, color: "hsl(38, 92%, 50%)" },
              { label: "Dívida Cartões", value: -cardDebt, color: "hsl(0, 72%, 51%)" },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="h-2 rounded-full mb-2" style={{ backgroundColor: item.color }} />
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-sm font-semibold ${item.value < 0 ? "text-expense" : ""}`}>{formatCurrency(Math.abs(item.value))}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base font-semibold">Movimentações Recentes</CardTitle></CardHeader>
        <CardContent>
          {recentAll.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação encontrada</p>
          ) : (
            <div className="space-y-3">
              {recentAll.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border bg-background/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                      {t.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${t.type === "income" ? "text-income" : "text-expense"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
