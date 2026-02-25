import { useState } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthPicker } from "@/components/MonthPicker";
import { useTransactions } from "@/hooks/useTransactions";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#6b7280"];

export default function Dashboard() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [], isLoading } = useTransactions(month);

  const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenses;

  // Category breakdown for pie chart
  const categoryMap = new Map<string, { name: string; value: number; color: string }>();
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const name = t.categories?.name || "Outros";
      const color = t.categories?.color || "#6b7280";
      const existing = categoryMap.get(name);
      if (existing) {
        existing.value += t.amount;
      } else {
        categoryMap.set(name, { name, value: t.amount, color });
      }
    });
  const pieData = Array.from(categoryMap.values());

  const barData = [
    { name: "Receitas", valor: income },
    { name: "Despesas", valor: expenses },
  ];

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${balance >= 0 ? "text-income" : "text-expense"}`}>
              {formatCurrency(balance)}
            </p>
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
          <CardHeader>
            <CardTitle className="text-base font-semibold">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {income === 0 && expenses === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma transação neste mês</p>
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
          <CardHeader>
            <CardTitle className="text-base font-semibold">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma despesa neste mês</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
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

      {/* Recent transactions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma transação encontrada</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border bg-background/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                      {t.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.categories?.name || "Sem categoria"}</p>
                      <p className="text-xs text-muted-foreground">{t.description || format(new Date(t.date), "dd/MM/yyyy")}</p>
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
