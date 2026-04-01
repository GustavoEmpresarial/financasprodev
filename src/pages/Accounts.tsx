import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, ArrowRightLeft, Building2, Wallet, Smartphone, TrendingUp, Bitcoin, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAccounts, type FinancialAccount } from "@/hooks/useAccounts";
import { useTransfers } from "@/hooks/useTransfers";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Conta Corrente", icon: Building2 },
  { value: "savings", label: "Poupança", icon: Building2 },
  { value: "cash", label: "Carteira (Dinheiro)", icon: Wallet },
  { value: "digital", label: "Conta Digital", icon: Smartphone },
  { value: "investment", label: "Conta de Investimento", icon: TrendingUp },
  { value: "crypto", label: "Conta Cripto", icon: Bitcoin },
];

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

export default function Accounts() {
  const { data: accounts = [], addAccount, updateAccount, deleteAccount } = useAccounts();
  const { data: transfers = [], addTransfer, deleteTransfer } = useTransfers();
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editItem, setEditItem] = useState<FinancialAccount | null>(null);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalBalance = accounts.filter(a => a.is_active).reduce((s, a) => s + a.balance, 0);
  const getTypeLabel = (type: string) => ACCOUNT_TYPES.find(t => t.value === type)?.label || type;
  const getTypeIcon = (type: string) => ACCOUNT_TYPES.find(t => t.value === type)?.icon || Building2;

  const handleAddAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addAccount.mutateAsync({
      name: form.get("name") as string,
      account_type: form.get("account_type") as string,
      balance: parseFloat(form.get("balance") as string) || 0,
      color: COLORS[accounts.length % COLORS.length],
    });
    setAddOpen(false);
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addTransfer.mutateAsync({
      from_account_id: form.get("from") as string,
      to_account_id: form.get("to") as string,
      amount: parseFloat(form.get("amount") as string),
      description: (form.get("description") as string) || undefined,
      date: form.get("date") as string,
    });
    setTransferOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas Financeiras</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas contas e saldos</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><ArrowRightLeft className="mr-2 h-4 w-4" />Transferir</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Transferência entre Contas</DialogTitle></DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="space-y-2">
                  <Label>Conta de Origem *</Label>
                  <Select name="from" required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta de Destino *</Label>
                  <Select name="to" required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input name="description" placeholder="Ex: Aporte para investimentos" />
                </div>
                <Button type="submit" className="w-full" disabled={addTransfer.isPending}>Transferir</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Conta</DialogTitle></DialogHeader>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input name="name" required placeholder="Ex: Nubank, Carteira" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select name="account_type" required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Saldo Inicial (R$)</Label>
                  <Input name="balance" type="number" step="0.01" defaultValue="0" />
                </div>
                <Button type="submit" className="w-full" disabled={addAccount.isPending}>Criar Conta</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Total */}
      <Card className="glass-card">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Total em Contas</p>
              <p className={`text-lg font-bold ${totalBalance >= 0 ? "text-income" : "text-expense"}`}>{formatCurrency(totalBalance)}</p>
            </div>
          </div>
          <Badge variant="secondary">{accounts.length} contas</Badge>
        </CardContent>
      </Card>

      {/* Accounts grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map(account => {
          const Icon = getTypeIcon(account.account_type);
          return (
            <Card key={account.id} className="glass-card overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: account.color || "hsl(var(--primary))" }} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${account.color}20` }}>
                    <Icon className="h-4 w-4" style={{ color: account.color || undefined }} />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{account.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{getTypeLabel(account.account_type)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(account)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => deleteAccount.mutate(account.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-xl font-bold ${account.balance >= 0 ? "text-income" : "text-expense"}`}>
                  {formatCurrency(account.balance)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Transfers */}
      {transfers.length > 0 && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Transferências Recentes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {transfers.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t.from_account?.name} → {t.to_account?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.description ? `${t.description} · ` : ""}{format(new Date(t.date + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatCurrency(t.amount)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTransfer.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Conta</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              await updateAccount.mutateAsync({
                id: editItem.id,
                name: form.get("name") as string,
                balance: parseFloat(form.get("balance") as string),
              });
              setEditItem(null);
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input name="name" defaultValue={editItem.name} required />
              </div>
              <div className="space-y-2">
                <Label>Saldo (R$)</Label>
                <Input name="balance" type="number" step="0.01" defaultValue={editItem.balance} />
              </div>
              <Button type="submit" className="w-full" disabled={updateAccount.isPending}>Salvar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
