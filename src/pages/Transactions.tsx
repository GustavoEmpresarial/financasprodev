import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, TrendingDown, Download } from "lucide-react";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MonthPicker } from "@/components/MonthPicker";
import { useTransactions, useCategories } from "@/hooks/useTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useAccounts } from "@/hooks/useAccounts";
import { Badge } from "@/components/ui/badge";

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "debit", label: "Débito" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "transfer", label: "Transferência" },
];

export default function Transactions() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [], deleteTransaction } = useTransactions(month);
  const { data: categories = [] } = useCategories();
  const { addTransaction } = useTransactions(month);
  const { data: cards = [] } = useCreditCards();
  const { data: accounts = [] } = useAccounts();
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [installmentCount, setInstallmentCount] = useState("1");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const totalAmount = parseFloat(form.get("amount") as string);
    const numInstallments = parseInt(installmentCount) || 1;
    const baseDate = form.get("date") as string;
    const categoryId = form.get("category_id") as string;
    const description = (form.get("description") as string) || undefined;
    const isFixed = form.get("is_fixed") === "on";
    const accountId = (form.get("account_id") as string) || null;
    const creditCardId = paymentMethod === "credit_card" ? selectedCardId || null : null;

    if (numInstallments > 1 && paymentMethod === "credit_card") {
      // Create installment group
      const groupId = crypto.randomUUID();
      const installmentAmount = Math.round((totalAmount / numInstallments) * 100) / 100;
      for (let i = 0; i < numInstallments; i++) {
        const [y, m, d] = baseDate.split("-").map(Number);
        const installmentDate = new Date(y, m - 1 + i, d);
        const dateStr = format(installmentDate, "yyyy-MM-dd");
        await addTransaction.mutateAsync({
          type: "expense",
          amount: installmentAmount,
          category_id: categoryId,
          description: description ? `${description} (${i + 1}/${numInstallments})` : `Parcela ${i + 1}/${numInstallments}`,
          date: dateStr,
          is_fixed: isFixed,
          payment_method: paymentMethod,
          credit_card_id: creditCardId,
        });
      }
    } else {
      await addTransaction.mutateAsync({
        type: "expense",
        amount: totalAmount,
        category_id: categoryId,
        description,
        date: baseDate,
        is_fixed: isFixed,
        payment_method: paymentMethod,
        credit_card_id: creditCardId,
      });
    }
    setOpen(false);
    setPaymentMethod("pix");
    setSelectedCardId("");
    setInstallmentCount("1");
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const expenses = transactions.filter((t) => t.type === "expense");
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const getMethodLabel = (m: string) => PAYMENT_METHODS.find((p) => p.value === m)?.label || m;

  const handleExportCSV = () => {
    const headers = ["Data", "Categoria", "Descrição", "Método", "Valor"];
    const rows = expenses.map(t => [
      format(new Date(t.date + "T12:00:00"), "dd/MM/yyyy"),
      t.categories?.name || "Sem categoria",
      t.description || "",
      getMethodLabel(t.payment_method),
      t.amount.toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `despesas_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas despesas mensais</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthPicker value={month} onChange={setMonth} />
          <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={expenses.length === 0}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <ReceiptScanner />
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPaymentMethod("pix"); setSelectedCardId(""); setInstallmentCount("1"); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Despesa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select name="category_id" required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Método de Pagamento *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod === "credit_card" && (
                  <>
                    <div className="space-y-2">
                      <Label>Cartão *</Label>
                      <Select value={selectedCardId} onValueChange={setSelectedCardId} required>
                        <SelectTrigger><SelectValue placeholder="Selecione o cartão..." /></SelectTrigger>
                        <SelectContent>
                          {cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.brand ? `(${c.brand})` : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Parcelas</Label>
                      <Select value={installmentCount} onValueChange={setInstallmentCount}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                            <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {accounts.length > 0 && paymentMethod !== "credit_card" && (
                  <div className="space-y-2">
                    <Label>Conta (opcional)</Label>
                    <Select name="account_id">
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input name="description" placeholder="Ex: Almoço no restaurante" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch name="is_fixed" id="is_fixed" />
                  <Label htmlFor="is_fixed" className="text-sm">Despesa fixa / recorrente</Label>
                </div>
                <Button type="submit" className="w-full" disabled={addTransaction.isPending || (paymentMethod === "credit_card" && !selectedCardId)}>
                  {parseInt(installmentCount) > 1 ? `Salvar em ${installmentCount}x` : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <Card className="glass-card">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-expense/10 text-expense">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de despesas no mês</p>
              <p className="text-lg font-bold text-expense">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
          <Badge variant="secondary">{expenses.length} lançamentos</Badge>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma despesa neste mês</p>
          ) : (
            <div className="divide-y">
              {expenses.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-expense/10 text-expense">
                      <TrendingDown className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.categories?.name || "Sem categoria"}</p>
                        {t.is_fixed && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Fixa</Badge>}
                        {t.installment_count > 1 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {t.installment_number}/{t.installment_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.description ? `${t.description} · ` : ""}
                        {format(new Date(t.date + "T12:00:00"), "dd/MM/yyyy")}
                        {t.payment_method && ` · ${getMethodLabel(t.payment_method)}`}
                        {t.credit_cards?.name && (
                          <span className="ml-1 text-primary">({t.credit_cards.name})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-expense">-{formatCurrency(t.amount)}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => deleteTransaction.mutate(t.id)}>
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
