import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, CreditCard as CreditCardIcon, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useTransactions } from "@/hooks/useTransactions";
import { Progress } from "@/components/ui/progress";
import { MonthPicker } from "@/components/MonthPicker";

const CARD_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

export default function CreditCards() {
  const { data: cards = [], addCard, deleteCard } = useCreditCards();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [] } = useTransactions(month);
  const [open, setOpen] = useState(false);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Calculate current invoice per card (expenses in the month)
  const getCardExpenses = (cardName: string) =>
    transactions
      .filter((t) => t.type === "expense" && t.description?.toLowerCase().includes(cardName.toLowerCase()))
      .reduce((sum, t) => sum + t.amount, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addCard.mutateAsync({
      name: form.get("name") as string,
      brand: (form.get("brand") as string) || null,
      total_limit: parseFloat(form.get("total_limit") as string),
      closing_day: parseInt(form.get("closing_day") as string),
      due_day: parseInt(form.get("due_day") as string),
      color: CARD_COLORS[cards.length % CARD_COLORS.length],
    });
    setOpen(false);
  };

  const totalLimit = cards.reduce((s, c) => s + c.total_limit, 0);
  const totalUsed = cards.reduce((s, c) => s + getCardExpenses(c.name), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cartões de Crédito</h1>
          <p className="text-sm text-muted-foreground">Controle de limites e faturas</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo Cartão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cartão</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Cartão</Label>
                  <Input name="name" required placeholder="Ex: Nubank" />
                </div>
                <div className="space-y-2">
                  <Label>Bandeira</Label>
                  <Input name="brand" placeholder="Visa, Mastercard..." />
                </div>
                <div className="space-y-2">
                  <Label>Limite Total (R$)</Label>
                  <Input name="total_limit" type="number" step="0.01" min="0" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia de Fechamento</Label>
                    <Input name="closing_day" type="number" min="1" max="31" required defaultValue="25" />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia de Vencimento</Label>
                    <Input name="due_day" type="number" min="1" max="31" required defaultValue="10" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={addCard.isPending}>Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Limite Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalLimit)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilizado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-expense">{formatCurrency(totalUsed)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Disponível</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(totalLimit - totalUsed)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards list */}
      <div className="grid gap-4 md:grid-cols-2">
        {cards.length === 0 ? (
          <Card className="glass-card col-span-full">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum cartão cadastrado
            </CardContent>
          </Card>
        ) : (
          cards.map((card) => {
            const used = getCardExpenses(card.name);
            const pct = card.total_limit > 0 ? (used / card.total_limit) * 100 : 0;
            return (
              <Card key={card.id} className="glass-card overflow-hidden">
                <div className="h-2" style={{ backgroundColor: card.color || "hsl(var(--primary))" }} />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{card.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{card.brand || "Sem bandeira"}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => deleteCard.mutate(card.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fatura atual</span>
                    <span className="font-semibold text-expense">{formatCurrency(used)}</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Limite: {formatCurrency(card.total_limit)}</span>
                    <span>Disponível: {formatCurrency(card.total_limit - used)}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Fecha dia {card.closing_day}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Vence dia {card.due_day}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
