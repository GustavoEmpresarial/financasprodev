import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, TrendingUp, TrendingDown, Tag } from "lucide-react";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MonthPicker } from "@/components/MonthPicker";
import { useTransactions, useCategories } from "@/hooks/useTransactions";
import { Badge } from "@/components/ui/badge";

export default function Transactions() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [], deleteTransaction } = useTransactions(month);
  const { data: categories = [] } = useCategories();
  const { addTransaction } = useTransactions(month);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addTransaction.mutateAsync({
      type,
      amount: parseFloat(form.get("amount") as string),
      category_id: form.get("category_id") as string,
      description: (form.get("description") as string) || undefined,
      date: form.get("date") as string,
      is_fixed: form.get("is_fixed") === "on",
    });
    setOpen(false);
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <ReceiptScanner />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={type === "expense" ? "default" : "outline"}
                    className={type === "expense" ? "bg-expense hover:bg-expense/90" : ""}
                    onClick={() => setType("expense")}
                    size="sm"
                  >
                    <TrendingDown className="mr-1 h-3 w-3" />
                    Despesa
                  </Button>
                  <Button
                    type="button"
                    variant={type === "income" ? "default" : "outline"}
                    className={type === "income" ? "bg-income hover:bg-income/90" : ""}
                    onClick={() => setType("income")}
                    size="sm"
                  >
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Receita
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select name="category_id" required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input name="description" placeholder="Ex: Almoço no restaurante" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch name="is_fixed" id="is_fixed" />
                  <Label htmlFor="is_fixed" className="text-sm">Despesa fixa</Label>
                </div>
                <Button type="submit" className="w-full" disabled={addTransaction.isPending}>
                  Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma transação neste mês</p>
          ) : (
            <div className="divide-y">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                      {t.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.categories?.name || "Sem categoria"}</p>
                        {t.is_fixed && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Fixa</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.description ? `${t.description} · ` : ""}{format(new Date(t.date), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-sm font-semibold ${t.type === "income" ? "text-income" : "text-expense"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-expense"
                      onClick={() => deleteTransaction.mutate(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
