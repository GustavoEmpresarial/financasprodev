import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle2, Circle, AlertTriangle, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MonthPicker } from "@/components/MonthPicker";
import { useBills } from "@/hooks/useBills";
import { useCategories } from "@/hooks/useTransactions";
import { Badge } from "@/components/ui/badge";

export default function Bills() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: bills = [], addBill, togglePaid, deleteBill } = useBills(month);
  const { data: categories = [] } = useCategories();
  const [open, setOpen] = useState(false);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addBill.mutateAsync({
      title: form.get("title") as string,
      amount: parseFloat(form.get("amount") as string),
      due_date: form.get("due_date") as string,
      is_recurring: form.get("is_recurring") === "on",
      recurrence_interval: (form.get("recurrence_interval") as string) || "monthly",
      category_id: (form.get("category_id") as string) || null,
      is_paid: false,
      notes: (form.get("notes") as string) || null,
    });
    setOpen(false);
  };

  const totalPending = bills.filter((b) => !b.is_paid).reduce((s, b) => s + b.amount, 0);
  const totalPaid = bills.filter((b) => b.is_paid).reduce((s, b) => s + b.amount, 0);

  const today = new Date().toISOString().split("T")[0];
  const overdueBills = bills.filter((b) => !b.is_paid && b.due_date < today);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Gerencie pagamentos e contas recorrentes</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Conta</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input name="title" required placeholder="Ex: Aluguel" />
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input name="due_date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select name="category_id">
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {categories.filter((c) => c.type === "expense").map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch name="is_recurring" id="is_recurring" />
                  <Label htmlFor="is_recurring" className="text-sm">Conta recorrente</Label>
                </div>
                <div className="space-y-2">
                  <Label>Observações (opcional)</Label>
                  <Input name="notes" placeholder="Detalhes adicionais..." />
                </div>
                <Button type="submit" className="w-full" disabled={addBill.isPending}>Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alerts */}
      {overdueBills.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm font-medium">
              {overdueBills.length} conta(s) vencida(s) — Total: {formatCurrency(overdueBills.reduce((s, b) => s + b.amount, 0))}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPending + totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bills list */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma conta neste mês</p>
          ) : (
            <div className="divide-y">
              {bills.map((b) => {
                const isOverdue = !b.is_paid && b.due_date < today;
                return (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30 sm:px-6">
                    <div className="flex items-center gap-3">
                      <button onClick={() => togglePaid.mutate({ id: b.id, is_paid: !b.is_paid })} className="flex-shrink-0">
                        {b.is_paid ? (
                          <CheckCircle2 className="h-5 w-5 text-income" />
                        ) : (
                          <Circle className={`h-5 w-5 ${isOverdue ? "text-expense" : "text-muted-foreground"}`} />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${b.is_paid ? "line-through text-muted-foreground" : ""}`}>{b.title}</p>
                          {b.is_recurring && <Badge variant="secondary" className="text-[10px] px-1.5 py-0"><RotateCw className="h-2.5 w-2.5 mr-0.5" />Recorrente</Badge>}
                          {isOverdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Vencida</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Vence em {format(new Date(b.due_date + "T12:00:00"), "dd/MM/yyyy")}
                          {b.categories?.name ? ` · ${b.categories.name}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold">{formatCurrency(b.amount)}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => deleteBill.mutate(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
