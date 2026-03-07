import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, BarChart3, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthPicker } from "@/components/MonthPicker";
import { useTransactions } from "@/hooks/useTransactions";
import { useEarnings } from "@/hooks/useEarnings";
import { useInvestments } from "@/hooks/useInvestments";
import { useCrypto } from "@/hooks/useCrypto";
import { useAltInvestments } from "@/hooks/useAltInvestments";
import { useCategoryBudgets } from "@/hooks/useCategoryBudgets";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function Analytics() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [] } = useTransactions(month);
  const { data: earnings = [], allData: allEarnings = [] } = useEarnings(month);

  // Get last 6 months data
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(month + "-01"), 5 - i);
    return format(d, "yyyy-MM");
  });

  const m0 = useTransactions(months[0]);
  const m1 = useTransactions(months[1]);
  const m2 = useTransactions(months[2]);
  const m3 = useTransactions(months[3]);
  const m4 = useTransactions(months[4]);
  const m5 = useTransactions(months[5]);
  const monthsData = [m0, m1, m2, m3, m4, m5];

  const { data: investments = [] } = useInvestments();
  const { data: cryptoHoldings = [], livePrices } = useCrypto();
  const { investments: altInvs = [] } = useAltInvestments();
  const { data: budgets = [] } = useCategoryBudgets(month);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Income = earnings (BRL)
  const income = earnings.filter((e) => e.currency === "BRL").reduce((s, e) => s + e.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  // Investments total
  const investmentTotal = investments.reduce((s, i) => s + i.current_value, 0);
  const altInvestmentTotal = altInvs.reduce((s, i) => s + i.invested_amount, 0);

  // Crypto total
  const getPrice = (symbol: string) => livePrices.data?.[symbol.toLowerCase()]?.brl || 0;
  const cryptoTotal = cryptoHoldings.reduce((s, h) => {
    const price = getPrice(h.symbol) || h.current_price;
    return s + h.quantity * price;
  }, 0);

  // Total earnings (all time BRL)
  const totalEarningsBRL = allEarnings.filter((e) => e.currency === "BRL").reduce((s, e) => s + e.amount, 0);

  const patrimonyTotal = balance + investmentTotal + altInvestmentTotal + cryptoTotal + totalEarningsBRL - income; // avoid double-counting current month earnings

  // Evolution chart data with earnings as income
  const evolutionData = months.map((m, i) => {
    const txs = monthsData[i].data || [];
    const mEarnings = allEarnings.filter((e) => e.date.startsWith(m) && e.currency === "BRL");
    const inc = mEarnings.reduce((s, e) => s + e.amount, 0);
    const exp = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const d = new Date(m + "-01");
    return {
      month: format(d, "MMM", { locale: ptBR }),
      receitas: inc,
      despesas: exp,
      saldo: inc - exp,
    };
  });

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

  // Budget alerts
  const budgetAlerts = budgets
    .map((b) => {
      const spent = transactions
        .filter((t) => t.type === "expense" && t.category_id === b.category_id)
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.budget_amount > 0 ? (spent / b.budget_amount) * 100 : 0;
      return { ...b, spent, pct };
    })
    .filter((b) => b.pct >= 80);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Analítico</h1>
          <p className="text-sm text-muted-foreground">Indicadores financeiros e análise comparativa</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Alerts */}
      {budgetAlerts.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-3 space-y-1">
            {budgetAlerts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                <span>
                  <strong>{a.categories?.name}</strong>: {formatCurrency(a.spent)} de {formatCurrency(a.budget_amount)} ({a.pct.toFixed(0)}%)
                  {a.pct >= 100 && <Badge variant="destructive" className="ml-2 text-[10px]">Excedido!</Badge>}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Patrimony */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Patrimônio Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(patrimonyTotal)}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Saldo: {formatCurrency(balance)}</span>
              <span>Invest: {formatCurrency(investmentTotal + altInvestmentTotal)}</span>
              <span>Crypto: {formatCurrency(cryptoTotal)}</span>
              <span>Ganhos: {formatCurrency(totalEarningsBRL)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas (Ganhos)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(income)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-expense">{formatCurrency(expenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Evolução Mensal (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="receitas" stroke="hsl(152, 69%, 40%)" strokeWidth={2} dot={{ r: 3 }} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 3 }} name="Despesas" />
                <Line type="monotone" dataKey="saldo" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={{ r: 3 }} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma despesa neste mês</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={50}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 text-xs min-w-[140px]">
                  {pieData.sort((a, b) => b.value - a.value).map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground truncate">{entry.name}</span>
                      <span className="ml-auto font-medium">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparative bar */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Comparativo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="receitas" fill="hsl(152, 69%, 40%)" radius={[4, 4, 0, 0]} name="Receitas" />
              <Bar dataKey="despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Patrimony breakdown */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Composição do Patrimônio</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: "Saldo em Conta", value: Math.max(balance, 0) },
                  { name: "Invest. Tradicionais", value: investmentTotal },
                  { name: "Invest. Alternativos", value: altInvestmentTotal },
                  { name: "Criptomoedas", value: cryptoTotal },
                ].filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
              >
                <Cell fill="hsl(162, 63%, 41%)" />
                <Cell fill="hsl(199, 89%, 48%)" />
                <Cell fill="hsl(262, 80%, 50%)" />
                <Cell fill="hsl(38, 92%, 50%)" />
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center flex-wrap gap-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(162, 63%, 41%)" }} />Saldo</div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(199, 89%, 48%)" }} />Tradicionais</div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(262, 80%, 50%)" }} />Alternativos</div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(38, 92%, 50%)" }} />Crypto</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
