import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, TrendingUp, Building2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInvestments } from "@/hooks/useInvestments";
import { Badge } from "@/components/ui/badge";

const TYPES: Record<string, string> = {
  cdb: "CDB",
  lci: "LCI",
  lca: "LCA",
  stocks: "Ações",
  funds: "Fundos",
  treasury: "Tesouro Direto",
  other: "Outro",
};

export default function Investments() {
  const { data: investments = [], addInvestment, updateInvestment, deleteInvestment } = useInvestments();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addInvestment.mutateAsync({
      name: form.get("name") as string,
      type: form.get("type") as string,
      institution: (form.get("institution") as string) || null,
      invested_amount: parseFloat(form.get("invested_amount") as string),
      current_value: parseFloat(form.get("current_value") as string),
      rate: (form.get("rate") as string) || null,
      start_date: form.get("start_date") as string,
      maturity_date: (form.get("maturity_date") as string) || null,
      notes: null,
    });
    setOpen(false);
  };

  const handleUpdateValue = async (id: string) => {
    await updateInvestment.mutateAsync({ id, current_value: parseFloat(editValue) });
    setEditId(null);
  };

  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.current_value, 0);
  const totalReturn = totalCurrent - totalInvested;
  const returnPct = totalInvested > 0 ? ((totalReturn / totalInvested) * 100).toFixed(2) : "0.00";

  // Group by type
  const byType = investments.reduce((acc, inv) => {
    const t = inv.type;
    if (!acc[t]) acc[t] = [];
    acc[t].push(inv);
    return acc;
  }, {} as Record<string, typeof investments>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investimentos</h1>
          <p className="text-sm text-muted-foreground">CDB, ações, fundos e mais</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo Investimento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Investimento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input name="name" required placeholder="Ex: CDB Banco Inter 120%" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select name="type" required>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instituição</Label>
                <Input name="institution" placeholder="Ex: Banco Inter" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Investido (R$)</Label>
                  <Input name="invested_amount" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label>Valor Atual (R$)</Label>
                  <Input name="current_value" type="number" step="0.01" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taxa / Rendimento</Label>
                <Input name="rate" placeholder="Ex: 120% CDI" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Aplicação</Label>
                  <Input name="start_date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento (opcional)</Label>
                  <Input name="maturity_date" type="date" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={addInvestment.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalCurrent)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalReturn >= 0 ? "text-income" : "text-expense"}`}>
              {totalReturn >= 0 ? "+" : ""}{formatCurrency(totalReturn)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rentabilidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${parseFloat(returnPct) >= 0 ? "text-income" : "text-expense"}`}>
              {returnPct}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By type */}
      {Object.entries(byType).length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum investimento cadastrado</CardContent>
        </Card>
      ) : (
        Object.entries(byType).map(([type, invs]) => (
          <Card key={type} className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {TYPES[type] || type}
                <Badge variant="secondary" className="text-xs">{invs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {invs.map((inv) => {
                  const ret = inv.current_value - inv.invested_amount;
                  const retPct = inv.invested_amount > 0 ? ((ret / inv.invested_amount) * 100).toFixed(2) : "0.00";
                  return (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 sm:px-6">
                      <div>
                        <p className="text-sm font-medium">{inv.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.institution || "Sem instituição"} · {inv.rate || "N/A"} · Desde {format(new Date(inv.start_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {editId === inv.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                className="h-7 w-28 text-xs"
                                type="number"
                                step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleUpdateValue(inv.id)}
                              />
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleUpdateValue(inv.id)}>OK</Button>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-semibold">{formatCurrency(inv.current_value)}</p>
                              <p className={`text-xs ${ret >= 0 ? "text-income" : "text-expense"}`}>
                                {ret >= 0 ? "+" : ""}{formatCurrency(ret)} ({retPct}%)
                              </p>
                            </>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditId(inv.id); setEditValue(String(inv.current_value)); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => deleteInvestment.mutate(inv.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
