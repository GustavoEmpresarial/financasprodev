import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { MonthPicker } from "@/components/MonthPicker";
import { useGoals } from "@/hooks/useGoals";

export default function Goals() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: goals = [], addGoal, updateGoal, deleteGoal } = useGoals(month);
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addGoal.mutateAsync({
      title: form.get("title") as string,
      target_amount: parseFloat(form.get("target_amount") as string),
      month,
    });
    setOpen(false);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleAddAmount = async (goal: any) => {
    const input = prompt("Quanto deseja adicionar? (R$)");
    if (!input) return;
    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) return;
    await updateGoal.mutateAsync({
      id: goal.id,
      current_amount: goal.current_amount + amount,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas Financeiras</h1>
          <p className="text-sm text-muted-foreground">Defina e acompanhe suas metas</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Meta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input name="title" required placeholder="Ex: Guardar para viagem" />
                </div>
                <div className="space-y-2">
                  <Label>Valor alvo (R$)</Label>
                  <Input name="target_amount" type="number" step="0.01" min="0.01" required placeholder="1000,00" />
                </div>
                <Button type="submit" className="w-full" disabled={addGoal.isPending}>Criar Meta</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {goals.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma meta para este mês</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            const completed = pct >= 100;
            return (
              <Card key={goal.id} className="glass-card">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-expense"
                    onClick={() => deleteGoal.mutate(goal.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pct} className={`h-2 ${completed ? "[&>div]:bg-income" : "[&>div]:bg-primary"}`} />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${completed ? "text-income" : "text-muted-foreground"}`}>
                      {completed ? "✓ Meta atingida!" : `${pct.toFixed(0)}%`}
                    </span>
                    {!completed && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAddAmount(goal)}>
                        + Adicionar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
