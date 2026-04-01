import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, RefreshCw, Pencil, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSubscriptions } from "@/hooks/useSubscriptions";

const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

export default function Subscriptions() {
  const { data: subs = [], addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const [open, setOpen] = useState(false);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const activeSubs = subs.filter(s => s.is_active);
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    if (s.frequency === "weekly") return sum + s.amount * 4;
    if (s.frequency === "quarterly") return sum + s.amount / 3;
    if (s.frequency === "yearly") return sum + s.amount / 12;
    return sum + s.amount;
  }, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addSubscription.mutateAsync({
      name: form.get("name") as string,
      amount: parseFloat(form.get("amount") as string),
      frequency: form.get("frequency") as string || "monthly",
      next_billing_date: (form.get("next_billing_date") as string) || null,
      notes: (form.get("notes") as string) || null,
      is_active: true,
      category_id: null,
      account_id: null,
      color: null,
      icon: null,
    });
    setOpen(false);
  };

  const getFreqLabel = (f: string) => FREQUENCIES.find(fr => fr.value === f)?.label || f;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus gastos recorrentes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Assinatura</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Assinatura</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input name="name" required placeholder="Ex: Netflix, Spotify" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select name="frequency" defaultValue="monthly">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Próxima cobrança</Label>
                <Input name="next_billing_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Input name="notes" placeholder="Plano família, etc." />
              </div>
              <Button type="submit" className="w-full" disabled={addSubscription.isPending}>Adicionar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <Card className="glass-card">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo mensal estimado</p>
              <p className="text-lg font-bold text-expense">{formatCurrency(monthlyTotal)}</p>
            </div>
          </div>
          <Badge variant="secondary">{activeSubs.length} ativas</Badge>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {subs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma assinatura cadastrada</p>
          ) : (
            <div className="divide-y">
              {subs.map(sub => (
                <div key={sub.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{sub.name}</p>
                        {!sub.is_active && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(sub.amount)} / {getFreqLabel(sub.frequency)}
                        {sub.next_billing_date && ` · Próx: ${format(new Date(sub.next_billing_date + "T12:00:00"), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sub.is_active}
                      onCheckedChange={(checked) => updateSubscription.mutate({ id: sub.id, is_active: checked })}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSubscription.mutate(sub.id)}>
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
