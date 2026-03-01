import { useState, useMemo } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { Plus, Trash2, ImagePlus, Gamepad2, DollarSign, CalendarClock, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAltInvestments, AltInvestment, AltEarning } from "@/hooks/useAltInvestments";

const CURRENCIES: Record<string, { label: string; symbol: string }> = {
  BRL: { label: "Real (R$)", symbol: "R$" },
  USD: { label: "Dólar ($)", symbol: "$" },
  CRYPTO: { label: "Crypto / Token", symbol: "⟠" },
};

function InvestmentCard({
  inv,
  invEarnings,
  onAddEarning,
  onDeleteEarning,
  onDelete,
}: {
  inv: AltInvestment;
  invEarnings: AltEarning[];
  onAddEarning: (investmentId: string, amount: number, date: string, notes: string) => void;
  onDeleteEarning: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [earningOpen, setEarningOpen] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  const cur = CURRENCIES[inv.currency] || CURRENCIES.BRL;

  const totalEarned = invEarnings.reduce((s, e) => s + e.amount, 0);
  const paybackPct = inv.invested_amount > 0 ? Math.min((totalEarned / inv.invested_amount) * 100, 100) : 0;
  const remaining = Math.max(inv.invested_amount - totalEarned, 0);

  // Average daily earning
  const uniqueDays = new Set(invEarnings.map((e) => e.date)).size;
  const avgDaily = uniqueDays > 0 ? totalEarned / uniqueDays : 0;

  // Days to payback
  const daysToPayback = avgDaily > 0 && remaining > 0 ? Math.ceil(remaining / avgDaily) : null;
  const paybackDate = daysToPayback ? addDays(new Date(), daysToPayback) : null;

  // Expiration analysis
  const hasExpiration = !!inv.expiration_date;
  const daysUntilExpiry = hasExpiration ? differenceInDays(new Date(inv.expiration_date!), new Date()) : null;
  const projectedEarningsAtExpiry = hasExpiration && avgDaily > 0 && daysUntilExpiry !== null && daysUntilExpiry > 0
    ? totalEarned + avgDaily * daysUntilExpiry
    : null;
  const projectedProfit = projectedEarningsAtExpiry !== null ? projectedEarningsAtExpiry - inv.invested_amount : null;

  const formatVal = (v: number) => `${cur.symbol} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const handleEarningSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onAddEarning(
      inv.id,
      parseFloat(fd.get("amount") as string),
      fd.get("date") as string,
      (fd.get("notes") as string) || ""
    );
    setEarningOpen(false);
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {inv.logo_url ? (
              <img src={inv.logo_url} alt={inv.name} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Gamepad2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{inv.name}</CardTitle>
              {inv.description && <p className="text-xs text-muted-foreground mt-0.5">{inv.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">{cur.label}</Badge>
            {hasExpiration && daysUntilExpiry !== null && (
              <Badge variant={daysUntilExpiry <= 7 ? "destructive" : "secondary"} className="text-xs">
                {daysUntilExpiry > 0 ? `${daysUntilExpiry}d restantes` : "Expirado"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Investido</p>
            <p className="text-sm font-bold">{formatVal(inv.invested_amount)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ganho Total</p>
            <p className="text-sm font-bold text-income">{formatVal(totalEarned)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Média/Dia</p>
            <p className="text-sm font-bold">{avgDaily > 0 ? formatVal(avgDaily) : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faltam</p>
            <p className="text-sm font-bold">{remaining > 0 ? formatVal(remaining) : "✅ Pago!"}</p>
          </div>
        </div>

        {/* Payback progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Payback</span>
            <span className="text-xs font-medium">{paybackPct.toFixed(1)}%</span>
          </div>
          <Progress value={paybackPct} className="h-2" />
        </div>

        {/* Timeline */}
        {daysToPayback && paybackDate && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-xs">
              Retorno estimado em <strong>{daysToPayback} dias</strong>{" "}
              ({daysToPayback > 30 ? `~${Math.round(daysToPayback / 30)} meses` : `${daysToPayback}d`})
              — por volta de <strong>{format(paybackDate, "dd/MM/yyyy")}</strong>
            </p>
          </div>
        )}

        {/* Expiration projection */}
        {hasExpiration && projectedProfit !== null && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${projectedProfit >= 0 ? "bg-income/10" : "bg-expense/10"}`}>
            <TrendingUp className="h-4 w-4" />
            <p className="text-xs">
              Projeção até expirar ({daysUntilExpiry}d):{" "}
              <strong className={projectedProfit >= 0 ? "text-income" : "text-expense"}>
                {projectedProfit >= 0 ? "+" : ""}{formatVal(projectedProfit)} lucro
              </strong>
              {" "}(Total: {formatVal(projectedEarningsAtExpiry!)})
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Dialog open={earningOpen} onOpenChange={setEarningOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1">
                <DollarSign className="mr-1 h-3 w-3" /> Registrar Ganho
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Ganho — {inv.name}</DialogTitle></DialogHeader>
              <form onSubmit={handleEarningSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Valor ({cur.symbol})</Label>
                  <Input name="amount" type="number" step="0.01" min="0" required placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                </div>
                <div className="space-y-2">
                  <Label>Observação (opcional)</Label>
                  <Input name="notes" placeholder="Ex: bônus diário" />
                </div>
                <Button type="submit" className="w-full">Salvar Ganho</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button size="sm" variant="ghost" onClick={() => setShowEarnings(!showEarnings)}>
            <CalendarClock className="mr-1 h-3 w-3" /> {showEarnings ? "Ocultar" : "Histórico"}
          </Button>

          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-expense" onClick={() => onDelete(inv.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Earnings history */}
        {showEarnings && (
          <div className="max-h-48 overflow-y-auto divide-y rounded-lg border">
            {invEarnings.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Nenhum ganho registrado</p>
            ) : (
              invEarnings.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30">
                  <div>
                    <span className="font-medium">{format(new Date(e.date), "dd/MM/yyyy")}</span>
                    {e.notes && <span className="ml-2 text-muted-foreground">— {e.notes}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-income">{formatVal(e.amount)}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDeleteEarning(e.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AltInvestments() {
  const { investments, earnings, addInvestment, deleteInvestment, addEarning, deleteEarning, uploadLogo } = useAltInvestments();
  const [open, setOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const earningsByInv = useMemo(() => {
    const map: Record<string, AltEarning[]> = {};
    earnings.forEach((e) => {
      if (!map[e.investment_id]) map[e.investment_id] = [];
      map[e.investment_id].push(e);
    });
    return map;
  }, [earnings]);

  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0);
  const totalEarned = earnings.reduce((s, e) => s + e.amount, 0);
  const totalProfit = totalEarned - totalInvested;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    let logo_url: string | null = null;
    if (logoFile) {
      logo_url = await uploadLogo(logoFile);
    }
    await addInvestment.mutateAsync({
      name: fd.get("name") as string,
      description: (fd.get("description") as string) || null,
      logo_url,
      currency: fd.get("currency") as string,
      invested_amount: parseFloat(fd.get("invested_amount") as string),
      expiration_date: (fd.get("expiration_date") as string) || null,
    });
    setOpen(false);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleAddEarning = (investmentId: string, amount: number, date: string, notes: string) => {
    addEarning.mutate({ investment_id: investmentId, amount, date, notes: notes || null });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investimentos Alternativos</h1>
          <p className="text-sm text-muted-foreground">Web3, jogos, plataformas — controle ganhos diários e payback</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo Investimento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Investimento Alternativo</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Logo upload */}
              <div className="flex items-center gap-4">
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                <div className="flex-1 space-y-2">
                  <Label>Nome *</Label>
                  <Input name="name" required placeholder="Ex: Pixels, Axie, BoomLand" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea name="description" placeholder="Detalhes do investimento..." rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Moeda *</Label>
                  <Select name="currency" required defaultValue="BRL">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CURRENCIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor Investido *</Label>
                  <Input name="invested_amount" type="number" step="0.01" min="0" required placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data de Expiração (opcional)</Label>
                <Input name="expiration_date" type="date" />
              </div>

              <Button type="submit" className="w-full" disabled={addInvestment.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">R$ {totalInvested.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ganho</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">R$ {totalEarned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro / Prejuízo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-income" : "text-expense"}`}>
              {totalProfit >= 0 ? "+" : ""}R$ {totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investment cards */}
      {investments.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum investimento alternativo cadastrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {investments.map((inv) => (
            <InvestmentCard
              key={inv.id}
              inv={inv}
              invEarnings={earningsByInv[inv.id] || []}
              onAddEarning={handleAddEarning}
              onDeleteEarning={(id) => deleteEarning.mutate(id)}
              onDelete={(id) => deleteInvestment.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
