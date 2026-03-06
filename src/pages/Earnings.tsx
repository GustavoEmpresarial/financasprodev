import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, Plus, Pencil, Trash2, TrendingUp, Link2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/MonthPicker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from "recharts";
import { useEarnings, EARNING_CATEGORIES, type Earning } from "@/hooks/useEarnings";
import { useAltInvestments } from "@/hooks/useAltInvestments";
import { useInvestments } from "@/hooks/useInvestments";

const CURRENCIES = ["BRL", "USD", "BTC", "ETH", "USDT", "SOL"];

function formatCurrency(v: number, currency = "BRL") {
  if (["BTC", "ETH", "SOL", "USDT"].includes(currency)) {
    return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
  }
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "BRL",
  });
}

function getCategoryLabel(val: string) {
  return EARNING_CATEGORIES.find((c) => c.value === val)?.label || val;
}

// ─── Add/Edit form ───────────────────────────────────────────────

type FormProps = {
  initial?: Partial<Earning>;
  onSubmit: (data: any) => void;
  isPending: boolean;
  altInvestments: { id: string; name: string }[];
  tradInvestments: { id: string; name: string }[];
};

function EarningForm({ initial, onSubmit, isPending, altInvestments, tradInvestments }: FormProps) {
  const [sourceName, setSourceName] = useState(initial?.source_name || "");
  const [amount, setAmount] = useState(initial?.amount?.toString() || "");
  const [currency, setCurrency] = useState(initial?.currency || "BRL");
  const [date, setDate] = useState(initial?.date || format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || "other");
  const [linkedAlt, setLinkedAlt] = useState(initial?.linked_investment_id || "__none__");
  const [linkedTrad, setLinkedTrad] = useState(initial?.linked_traditional_investment_id || "__none__");

  const dateWarning = (() => {
    if (!date) return null;
    const parts = date.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date();
    if (d > now) return "Data no futuro";
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (d < twoYearsAgo) return "Data anterior a 2 anos";
    return null;
  })();

  const handleSubmit = () => {
    onSubmit({
      source_name: sourceName,
      amount: parseFloat(amount),
      currency,
      date,
      description: description || null,
      category,
      linked_investment_id: linkedAlt === "__none__" ? null : linkedAlt,
      linked_traditional_investment_id: linkedTrad === "__none__" ? null : linkedTrad,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fonte / Investimento *</Label>
          <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} maxLength={200} placeholder="Ex: Yield Guild, CDB Banco X" />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EARNING_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Valor *</Label>
          <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label>Moeda</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {dateWarning && (
            <p className="flex items-center gap-1 text-xs text-warning">
              <AlertTriangle className="h-3 w-3" />{dateWarning}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Vincular Invest. Alternativo</Label>
          <Select value={linkedAlt} onValueChange={setLinkedAlt}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {altInvestments.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Vincular Invest. Tradicional</Label>
          <Select value={linkedTrad} onValueChange={setLinkedTrad}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {tradInvestments.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} placeholder="Detalhes do ganho..." />
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isPending || !sourceName.trim() || !amount || parseFloat(amount) <= 0}>
          {initial?.id ? "Salvar alterações" : "Registrar ganho"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────

export default function Earnings() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: earnings, allData, isLoading, addEarning, updateEarning, deleteEarning } = useEarnings(month);
  const { investments: altInvs } = useAltInvestments();
  const { data: tradInvs = [] } = useInvestments();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Earning | null>(null);

  // Monthly total (BRL only for simplicity)
  const monthlyBRL = earnings.filter((e) => e.currency === "BRL").reduce((s, e) => s + e.amount, 0);
  const monthlyUSD = earnings.filter((e) => e.currency === "USD").reduce((s, e) => s + e.amount, 0);
  const monthlyCrypto = earnings.filter((e) => !["BRL", "USD"].includes(e.currency)).length;

  // Yearly total
  const year = month.split("-")[0];
  const yearlyBRL = allData.filter((e) => e.date.startsWith(year) && e.currency === "BRL").reduce((s, e) => s + e.amount, 0);

  // ROI calculation for linked investments
  const roiMap = new Map<string, { invested: number; earned: number; name: string }>();
  allData.forEach((e) => {
    const invId = e.linked_investment_id || e.linked_traditional_investment_id;
    if (!invId) return;
    const inv = altInvs.find((i) => i.id === invId) || tradInvs.find((i) => i.id === invId);
    if (!inv) return;
    const existing = roiMap.get(invId) || { invested: "invested_amount" in inv ? inv.invested_amount : 0, earned: 0, name: inv.name };
    existing.earned += e.currency === "BRL" ? e.amount : 0;
    roiMap.set(invId, existing);
  });
  const roiList = Array.from(roiMap.entries())
    .map(([id, v]) => ({ id, ...v, roi: v.invested > 0 ? ((v.earned / v.invested) * 100) : 0 }))
    .filter((r) => r.earned > 0)
    .sort((a, b) => b.roi - a.roi);

  // Evolution chart (last 6 months)
  const evolutionData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(month + "-01"), 5 - i);
    const m = format(d, "yyyy-MM");
    const total = allData.filter((e) => e.date.startsWith(m) && e.currency === "BRL").reduce((s, e) => s + e.amount, 0);
    return { month: format(d, "MMM", { locale: ptBR }), total };
  });

  // Category breakdown
  const catMap = new Map<string, number>();
  earnings.filter((e) => e.currency === "BRL").forEach((e) => {
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
  });
  const catData = Array.from(catMap.entries()).map(([cat, value]) => ({
    name: getCategoryLabel(cat),
    value,
  })).sort((a, b) => b.value - a.value);

  const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#6b7280"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ganhos & Lucros</h1>
          <p className="text-sm text-muted-foreground">Registre e acompanhe todos os seus ganhos de investimentos e outras fontes</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Ganho</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar Ganho</DialogTitle></DialogHeader>
              <EarningForm
                onSubmit={(data) => { addEarning.mutate(data, { onSuccess: () => setAddOpen(false) }); }}
                isPending={addEarning.isPending}
                altInvestments={altInvs.map((i) => ({ id: i.id, name: i.name }))}
                tradInvestments={tradInvs.map((i) => ({ id: i.id, name: i.name }))}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Mensal (BRL)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(monthlyBRL)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Mensal (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(monthlyUSD, "USD")}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganhos Crypto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{monthlyCrypto} registros</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acumulado {year} (BRL)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(yearlyBRL)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Evolução de Lucros (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="total" stroke="hsl(152, 69%, 40%)" strokeWidth={2} dot={{ r: 3 }} name="Ganhos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />Por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {catData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhum ganho em BRL neste mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={catData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Valor">
                    {catData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROI */}
      {roiList.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />ROI por Investimento Vinculado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roiList.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border bg-background/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Investido: {formatCurrency(r.invested)} · Ganho: {formatCurrency(r.earned)}
                    </p>
                  </div>
                  <Badge variant={r.roi >= 100 ? "default" : "secondary"} className="text-sm">
                    ROI {r.roi.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings list */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Registros do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum ganho registrado neste mês</p>
          ) : (
            <div className="space-y-2">
              {earnings.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border bg-background/50 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-income/10 text-income flex-shrink-0">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{e.source_name}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">{getCategoryLabel(e.category)}</Badge>
                        {(e.linked_investment_id || e.linked_traditional_investment_id) && (
                          <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {e.description ? `${e.description} · ` : ""}
                        {format(new Date(e.date + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-sm font-semibold text-income">+{formatCurrency(e.amount, e.currency)}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir ganho?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o ganho de {formatCurrency(e.amount, e.currency)} de {e.source_name}? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteEarning.mutate(e.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Ganho</DialogTitle></DialogHeader>
          {editItem && (
            <EarningForm
              initial={editItem}
              onSubmit={(data) => {
                updateEarning.mutate({ id: editItem.id, ...data }, { onSuccess: () => setEditItem(null) });
              }}
              isPending={updateEarning.isPending}
              altInvestments={altInvs.map((i) => ({ id: i.id, name: i.name }))}
              tradInvestments={tradInvs.map((i) => ({ id: i.id, name: i.name }))}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
