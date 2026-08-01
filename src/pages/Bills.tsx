import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle2, Circle, AlertTriangle, RotateCw, Pencil, Copy, History, CalendarClock, Split } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/MonthPicker";
import { ListToolbar, ListPagination, useListControls } from "@/components/ListControls";
import { RecordHistoryDialog } from "@/components/RecordHistoryDialog";
import { useBills, BILL_STATUS, BILL_PRIORITIES, type Bill } from "@/hooks/useBills";
import { useCategories } from "@/hooks/useCategories";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useAccounts } from "@/hooks/useAccounts";
import { RECURRENCE_INTERVALS } from "@/hooks/useTransactions";

const statusLabel = (s: string) => BILL_STATUS.find((x) => x.value === s)?.label ?? s;
const priorityLabel = (p: string) => BILL_PRIORITIES.find((x) => x.value === p)?.label ?? p;

export default function Bills() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const {
    data: bills, addBill, updateBill, duplicateBill, deleteBill, setStatus,
    postponeBill, splitBill, makeRecurring, bulkDelete, bulkStatus,
  } = useBills(month);
  const { expenseCategories, subcategoriesOf } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: accounts = [] } = useAccounts();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [historyFor, setHistoryFor] = useState<Bill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);
  const [splitTarget, setSplitTarget] = useState<Bill | null>(null);
  const [splitParcels, setSplitParcels] = useState("2");
  const [formCategory, setFormCategory] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);

  const formatCurrency = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const today = new Date().toISOString().split("T")[0];

  const normalized = bills.map((b) => ({
    ...b,
    effectiveStatus: b.status === "pending" && b.due_date < today ? "overdue" : b.status,
  }));

  const controls = useListControls(normalized, {
    searchFields: (b) => `${b.title} ${b.notes ?? ""}`,
    initialSort: "due_date",
    initialDir: "asc",
    filterFn: (b, f) => b.effectiveStatus === f,
  });

  const openNew = () => { setEditing(null); setFormCategory(""); setIsRecurring(false); setOpen(true); };
  const openEdit = (b: Bill) => {
    setEditing(b);
    setFormCategory(b.category_id ?? "");
    setIsRecurring(b.is_recurring);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title") as string,
      amount: parseFloat(form.get("amount") as string),
      due_date: form.get("due_date") as string,
      payment_date: (form.get("payment_date") as string) || null,
      category_id: formCategory || null,
      subcategory_id: (form.get("subcategory_id") as string) || null,
      account_id: (form.get("account_id") as string) || null,
      payment_method_id: (form.get("payment_method_id") as string) || null,
      priority: (form.get("priority") as string) || "medium",
      status: (form.get("status") as string) || "pending",
      is_recurring: isRecurring,
      recurrence_interval: (form.get("recurrence_interval") as string) || "monthly",
      notes: (form.get("notes") as string) || null,
      tags: ((form.get("tags") as string) || "").split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (editing) {
      await updateBill.mutateAsync({ id: editing.id, ...payload });
    } else {
      await addBill.mutateAsync({
        ...payload,
        installment_count: parseInt((form.get("installment_count") as string) || "1"),
      });
    }
    setOpen(false);
    setEditing(null);
  };

  const totalPending = bills.filter((b) => b.status !== "paid" && b.status !== "canceled").reduce((s, b) => s + b.amount, 0);
  const totalPaid = bills.filter((b) => b.status === "paid").reduce((s, b) => s + b.amount, 0);
  const overdueBills = normalized.filter((b) => b.effectiveStatus === "overdue");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Centro de pagamentos: vencimentos, parcelas e recorrências</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
        </div>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p></CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-income">{formatCurrency(totalPaid)}</p></CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total no Mês</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalPending + totalPaid)}</p></CardContent>
        </Card>
      </div>

      <ListToolbar
        controls={controls}
        searchPlaceholder="Pesquisar contas…"
        sortOptions={[
          { value: "due_date", label: "Vencimento" },
          { value: "amount", label: "Valor" },
          { value: "title", label: "Nome" },
          { value: "priority", label: "Prioridade" },
        ]}
        filterOptions={BILL_STATUS}
      />

      {controls.selected.length > 0 && (
        <Card className="border-primary/40">
          <CardContent className="flex flex-wrap items-center gap-2 py-3">
            <p className="text-sm font-medium">{controls.selected.length} selecionada(s)</p>
            <Button size="sm" variant="outline" onClick={() => { bulkStatus.mutate({ ids: controls.selected, status: "paid" }); controls.clearSelection(); }}>
              Marcar como pagas
            </Button>
            <Button size="sm" variant="outline" onClick={() => { bulkStatus.mutate({ ids: controls.selected, status: "pending" }); controls.clearSelection(); }}>
              Marcar como pendentes
            </Button>
            <Button size="sm" variant="destructive" onClick={() => { bulkDelete.mutate(controls.selected); controls.clearSelection(); }}>
              Excluir
            </Button>
            <Button size="sm" variant="ghost" onClick={controls.clearSelection}>Cancelar</Button>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardContent className="p-0">
          {controls.paged.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma conta encontrada</p>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-2 sm:px-6">
                <Checkbox
                  checked={controls.selected.length === controls.paged.length && controls.paged.length > 0}
                  onCheckedChange={controls.toggleSelectAll}
                />
                <span className="text-xs text-muted-foreground">Selecionar tudo</span>
              </div>
              <div className="divide-y">
                {controls.paged.map((b: any) => {
                  const isOverdue = b.effectiveStatus === "overdue";
                  return (
                    <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={controls.selected.includes(b.id)} onCheckedChange={() => controls.toggleSelect(b.id)} />
                        <button
                          onClick={() => setStatus.mutate({ id: b.id, status: b.status === "paid" ? "pending" : "paid", amount: b.amount })}
                          className="flex-shrink-0"
                          title="Marcar como paga"
                        >
                          {b.status === "paid" ? (
                            <CheckCircle2 className="h-5 w-5 text-income" />
                          ) : (
                            <Circle className={`h-5 w-5 ${isOverdue ? "text-expense" : "text-muted-foreground"}`} />
                          )}
                        </button>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-sm font-medium ${b.status === "paid" ? "line-through text-muted-foreground" : ""}`}>{b.title}</p>
                            {b.is_recurring && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]"><RotateCw className="mr-0.5 h-2.5 w-2.5" />Recorrente</Badge>}
                            {isOverdue && <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">Atrasado</Badge>}
                            {b.status === "partial" && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">Parcial</Badge>}
                            {b.status === "canceled" && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">Cancelado</Badge>}
                            {b.installment_count > 1 && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{b.installment_number}/{b.installment_count}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Vence em {format(new Date(b.due_date + "T12:00:00"), "dd/MM/yyyy")}
                            {` · ${statusLabel(b.effectiveStatus)}`}
                            {` · Prioridade ${priorityLabel(b.priority)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="mr-2 text-sm font-semibold">{formatCurrency(b.amount)}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={() => duplicateBill.mutate(b)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Adiar 7 dias" onClick={() => postponeBill.mutate({ id: b.id, days: 7, due_date: b.due_date })}><CalendarClock className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Parcelar" onClick={() => { setSplitTarget(b); setSplitParcels("2"); }}><Split className="h-3.5 w-3.5" /></Button>
                        {!b.is_recurring && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Tornar recorrente" onClick={() => makeRecurring.mutate({ bill: b, frequency: "monthly" })}><RotateCw className="h-3.5 w-3.5" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Histórico" onClick={() => setHistoryFor(b)}><History className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" title="Excluir" onClick={() => setDeleteTarget(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <ListPagination controls={controls} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Form */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input name="title" required defaultValue={editing?.title ?? ""} placeholder="Ex: Aluguel" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input name="amount" type="number" step="0.01" min="0.01" required defaultValue={editing?.amount ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input name="due_date" type="date" required defaultValue={editing?.due_date ?? format(new Date(), "yyyy-MM-dd")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de pagamento</Label>
                <Input name="payment_date" type="date" defaultValue={editing?.payment_date ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "pending"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILL_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Select name="subcategory_id" defaultValue={editing?.subcategory_id ?? undefined} disabled={subcategoriesOf(formCategory).length === 0}>
                  <SelectTrigger><SelectValue placeholder={subcategoriesOf(formCategory).length ? "Selecione…" : "Sem subcategorias"} /></SelectTrigger>
                  <SelectContent>
                    {subcategoriesOf(formCategory).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta bancária</Label>
                <Select name="account_id" defaultValue={editing?.account_id ?? undefined}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Método de pagamento</Label>
                <Select name="payment_method_id" defaultValue={editing?.payment_method_id ?? undefined}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select name="priority" defaultValue={editing?.priority ?? "medium"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILL_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Select name="installment_count" defaultValue="1">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is_recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
              <Label htmlFor="is_recurring" className="text-sm">Conta recorrente</Label>
            </div>
            {isRecurring && (
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select name="recurrence_interval" defaultValue={editing?.recurrence_interval ?? "monthly"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_INTERVALS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Etiquetas (separadas por vírgula)</Label>
              <Input name="tags" defaultValue={(editing?.tags ?? []).join(", ")} placeholder="casa, essencial" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input name="notes" defaultValue={editing?.notes ?? ""} placeholder="Detalhes adicionais…" />
            </div>
            <Button type="submit" className="w-full" disabled={addBill.isPending || updateBill.isPending}>
              {editing ? "Salvar alterações" : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Parcelar */}
      <Dialog open={!!splitTarget} onOpenChange={(o) => !o && setSplitTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Parcelar conta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {splitTarget?.title} — {formatCurrency(splitTarget?.amount ?? 0)}
            </p>
            <div className="space-y-2">
              <Label>Número de parcelas</Label>
              <Select value={splitParcels} onValueChange={setSplitParcels}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                if (splitTarget) await splitBill.mutateAsync({ bill: splitTarget, parcels: parseInt(splitParcels) });
                setSplitTarget(null);
              }}
            >
              Confirmar parcelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RecordHistoryDialog
        table="bills"
        recordId={historyFor?.id}
        title={historyFor?.title}
        open={!!historyFor}
        onOpenChange={(o) => !o && setHistoryFor(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" será removida da lista. O registro fica no histórico de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteBill.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
