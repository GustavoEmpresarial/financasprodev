import { useState, useMemo } from "react";
import { format, differenceInDays, addDays, parseISO } from "date-fns";
import {
  Plus, Trash2, ImagePlus, Gamepad2, DollarSign, CalendarClock,
  TrendingUp, Clock, Pencil, AlertTriangle, X, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAltInvestments, AltInvestment, AltEarning } from "@/hooks/useAltInvestments";
import { toast } from "sonner";

const CURRENCIES: Record<string, { label: string; symbol: string }> = {
  BRL: { label: "Real (R$)", symbol: "R$" },
  USD: { label: "Dólar ($)", symbol: "$" },
  CRYPTO: { label: "Crypto / Token", symbol: "⟠" },
};

/**
 * Formats a date string (YYYY-MM-DD) for display without timezone conversion.
 * Uses parseISO + manual formatting to avoid UTC offset issues.
 */
function formatDateSafe(dateStr: string): string {
  // Parse the date parts directly to avoid timezone shifts
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function DateWarning({ dateStr }: { dateStr: string }) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const today = new Date();
  const inputDate = new Date(year, month - 1, day);

  // Warn if date is in the future
  const isFuture = inputDate > today;
  // Warn if date is more than 365 days ago
  const diffDays = differenceInDays(today, inputDate);
  const isTooOld = diffDays > 365;

  if (!isFuture && !isTooOld) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      <span>
        {isFuture ? "Data no futuro — verifique se está correta." : "Data com mais de 1 ano — verifique se está correta."}
      </span>
    </div>
  );
}

function EditEarningRow({
  earning,
  currencySymbol,
  onSave,
  onCancel,
}: {
  earning: AltEarning;
  currencySymbol: string;
  onSave: (id: string, amount: number, date: string, notes: string | null) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(earning.amount));
  const [date, setDate] = useState(earning.date);
  const [notes, setNotes] = useState(earning.notes || "");

  return (
    <div className="flex flex-col gap-2 px-3 py-2 bg-muted/50">
      <div className="grid grid-cols-3 gap-2">
        <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-7 text-xs" />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 text-xs" />
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" className="h-7 text-xs" />
      </div>
      {date && <DateWarning dateStr={date} />}
      <div className="flex gap-1 justify-end">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}><X className="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => onSave(earning.id, parseFloat(amount), date, notes || null)}>
          <Check className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function EditInvestmentDialog({
  inv,
  onSave,
  onUploadLogo,
}: {
  inv: AltInvestment;
  onSave: (updates: Partial<AltInvestment> & { id: string }) => void;
  onUploadLogo: (file: File) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(inv.name);
  const [description, setDescription] = useState(inv.description || "");
  const [currency, setCurrency] = useState(inv.currency);
  const [investedAmount, setInvestedAmount] = useState(String(inv.invested_amount));
  const [expirationDate, setExpirationDate] = useState(inv.expiration_date || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(inv.logo_url);
  const [saving, setSaving] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let logo_url = inv.logo_url;
      if (logoFile) {
        logo_url = await onUploadLogo(logoFile);
      }
      onSave({
        id: inv.id,
        name: name.trim(),
        description: description.trim() || null,
        currency,
        invested_amount: parseFloat(investedAmount),
        expiration_date: expirationDate || null,
        logo_url,
      });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar Investimento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Moeda *</Label>
              <Select value={currency} onValueChange={setCurrency}>
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
              <Input type="number" step="0.01" min="0" value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data de Expiração</Label>
            <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvestmentCard({
  inv,
  invEarnings,
  onAddEarning,
  onUpdateEarning,
  onDeleteEarning,
  onUpdateInvestment,
  onDelete,
  onUploadLogo,
}: {
  inv: AltInvestment;
  invEarnings: AltEarning[];
  onAddEarning: (investmentId: string, amount: number, date: string, notes: string) => void;
  onUpdateEarning: (id: string, amount: number, date: string, notes: string | null) => void;
  onDeleteEarning: (id: string) => void;
  onUpdateInvestment: (updates: Partial<AltInvestment> & { id: string }) => void;
  onDelete: (id: string) => void;
  onUploadLogo: (file: File) => Promise<string>;
}) {
  const [earningOpen, setEarningOpen] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteEarningId, setDeleteEarningId] = useState<string | null>(null);
  const [editingEarningId, setEditingEarningId] = useState<string | null>(null);
  const [earningDate, setEarningDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const cur = CURRENCIES[inv.currency] || CURRENCIES.BRL;

  const totalEarned = invEarnings.reduce((s, e) => s + e.amount, 0);
  const paybackPct = inv.invested_amount > 0 ? Math.min((totalEarned / inv.invested_amount) * 100, 100) : 0;
  const remaining = Math.max(inv.invested_amount - totalEarned, 0);

  const uniqueDays = new Set(invEarnings.map((e) => e.date)).size;
  const avgDaily = uniqueDays > 0 ? totalEarned / uniqueDays : 0;
  const daysToPayback = avgDaily > 0 && remaining > 0 ? Math.ceil(remaining / avgDaily) : null;
  const paybackDate = daysToPayback ? addDays(new Date(), daysToPayback) : null;

  const hasExpiration = !!inv.expiration_date;
  const daysUntilExpiry = hasExpiration ? differenceInDays(new Date(inv.expiration_date! + "T12:00:00"), new Date()) : null;
  const projectedEarningsAtExpiry = hasExpiration && avgDaily > 0 && daysUntilExpiry !== null && daysUntilExpiry > 0
    ? totalEarned + avgDaily * daysUntilExpiry
    : null;
  const projectedProfit = projectedEarningsAtExpiry !== null ? projectedEarningsAtExpiry - inv.invested_amount : null;

  const formatVal = (v: number) => `${cur.symbol} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const handleEarningSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dateValue = fd.get("date") as string;
    onAddEarning(
      inv.id,
      parseFloat(fd.get("amount") as string),
      dateValue,
      (fd.get("notes") as string) || ""
    );
    setEarningOpen(false);
  };

  return (
    <>
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Payback</span>
              <span className="text-xs font-medium">{paybackPct.toFixed(1)}%</span>
            </div>
            <Progress value={paybackPct} className="h-2" />
          </div>

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
                    <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                      name="date"
                      type="date"
                      required
                      value={earningDate}
                      onChange={(e) => setEarningDate(e.target.value)}
                    />
                    {earningDate && <DateWarning dateStr={earningDate} />}
                  </div>
                  <div className="space-y-2">
                    <Label>Observação (opcional)</Label>
                    <Input name="notes" placeholder="Ex: bônus diário" maxLength={500} />
                  </div>
                  <Button type="submit" className="w-full">Salvar Ganho</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button size="sm" variant="ghost" onClick={() => setShowEarnings(!showEarnings)}>
              <CalendarClock className="mr-1 h-3 w-3" /> {showEarnings ? "Ocultar" : "Histórico"}
            </Button>

            <EditInvestmentDialog inv={inv} onSave={onUpdateInvestment} onUploadLogo={onUploadLogo} />

            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-expense"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {showEarnings && (
            <div className="max-h-64 overflow-y-auto divide-y rounded-lg border">
              {invEarnings.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhum ganho registrado</p>
              ) : (
                invEarnings.map((e) =>
                  editingEarningId === e.id ? (
                    <EditEarningRow
                      key={e.id}
                      earning={e}
                      currencySymbol={cur.symbol}
                      onSave={(id, amount, date, notes) => {
                        onUpdateEarning(id, amount, date, notes);
                        setEditingEarningId(null);
                      }}
                      onCancel={() => setEditingEarningId(null)}
                    />
                  ) : (
                    <div key={e.id} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30">
                      <div>
                        <span className="font-medium">{formatDateSafe(e.date)}</span>
                        {e.notes && <span className="ml-2 text-muted-foreground">— {e.notes}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-income">{formatVal(e.amount)}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingEarningId(e.id)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setDeleteEarningId(e.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete investment confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir investimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá permanentemente <strong>{inv.name}</strong> e todos os ganhos associados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(inv.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete earning confirmation */}
      <AlertDialog open={!!deleteEarningId} onOpenChange={(open) => !open && setDeleteEarningId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ganho?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover este registro de ganho? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteEarningId) { onDeleteEarning(deleteEarningId); setDeleteEarningId(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AltInvestments() {
  const { investments, earnings, addInvestment, updateInvestment, deleteInvestment, addEarning, updateEarning, deleteEarning, uploadLogo } = useAltInvestments();
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

  const handleUpdateEarning = (id: string, amount: number, date: string, notes: string | null) => {
    updateEarning.mutate({ id, amount, date, notes });
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
                  <Input name="name" required placeholder="Ex: Pixels, Axie, BoomLand" maxLength={200} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea name="description" placeholder="Detalhes do investimento..." rows={2} maxLength={1000} />
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">R$ {totalInvested.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Ganho</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-income">R$ {totalEarned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Lucro / Prejuízo</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-income" : "text-expense"}`}>
              {totalProfit >= 0 ? "+" : ""}R$ {totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

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
              onUpdateEarning={handleUpdateEarning}
              onDeleteEarning={(id) => deleteEarning.mutate(id)}
              onUpdateInvestment={(updates) => updateInvestment.mutate(updates)}
              onDelete={(id) => deleteInvestment.mutate(id)}
              onUploadLogo={uploadLogo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
