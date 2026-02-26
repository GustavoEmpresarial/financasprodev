import { useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Bitcoin, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCrypto } from "@/hooks/useCrypto";

const POPULAR_CRYPTOS = [
  { symbol: "bitcoin", name: "Bitcoin" },
  { symbol: "ethereum", name: "Ethereum" },
  { symbol: "solana", name: "Solana" },
  { symbol: "binancecoin", name: "BNB" },
  { symbol: "cardano", name: "Cardano" },
  { symbol: "ripple", name: "XRP" },
  { symbol: "polkadot", name: "Polkadot" },
  { symbol: "avalanche-2", name: "Avalanche" },
];

export default function Crypto() {
  const { data: holdings = [], livePrices, addCrypto, deleteCrypto } = useCrypto();
  const [open, setOpen] = useState(false);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getPrice = (symbol: string) =>
    livePrices.data?.[symbol.toLowerCase()]?.brl || 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const symbol = form.get("symbol") as string;
    const crypto = POPULAR_CRYPTOS.find((c) => c.symbol === symbol);
    await addCrypto.mutateAsync({
      symbol,
      name: crypto?.name || symbol,
      quantity: parseFloat(form.get("quantity") as string),
      avg_buy_price: parseFloat(form.get("avg_buy_price") as string),
      current_price: 0,
      notes: null,
    });
    setOpen(false);
  };

  const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0);
  const totalCurrent = holdings.reduce((s, h) => {
    const price = getPrice(h.symbol) || h.current_price;
    return s + h.quantity * price;
  }, 0);
  const totalPnL = totalCurrent - totalInvested;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Criptomoedas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe saldo, valorização e lucro/prejuízo</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => livePrices.refetch()} disabled={livePrices.isFetching}>
            <RefreshCw className={`mr-2 h-3 w-3 ${livePrices.isFetching ? "animate-spin" : ""}`} />
            Atualizar Preços
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Adicionar Crypto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Criptomoeda</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Criptomoeda</Label>
                  <select name="symbol" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {POPULAR_CRYPTOS.map((c) => (
                      <option key={c.symbol} value={c.symbol}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input name="quantity" type="number" step="0.00000001" min="0" required placeholder="0.5" />
                </div>
                <div className="space-y-2">
                  <Label>Preço Médio de Compra (R$)</Label>
                  <Input name="avg_buy_price" type="number" step="0.01" min="0" required placeholder="250000" />
                </div>
                <Button type="submit" className="w-full" disabled={addCrypto.isPending}>Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro / Prejuízo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {totalPnL >= 0 ? <TrendingUp className="h-5 w-5 text-income" /> : <TrendingDown className="h-5 w-5 text-expense" />}
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? "text-income" : "text-expense"}`}>
                {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bitcoin className="h-4 w-4 text-warning" />
            Suas Criptomoedas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {holdings.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma criptomoeda cadastrada</p>
          ) : (
            <div className="divide-y">
              {holdings.map((h) => {
                const livePrice = getPrice(h.symbol);
                const currentPrice = livePrice || h.current_price;
                const totalValue = h.quantity * currentPrice;
                const invested = h.quantity * h.avg_buy_price;
                const pnl = totalValue - invested;
                const pnlPct = invested > 0 ? ((pnl / invested) * 100).toFixed(2) : "0.00";
                return (
                  <div key={h.id} className="flex items-center justify-between px-4 py-4 hover:bg-muted/30 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning font-bold text-xs">
                        {h.symbol.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{h.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.quantity} unidades · Preço médio: {formatCurrency(h.avg_buy_price)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(totalValue)}</p>
                        <p className={`text-xs ${pnl >= 0 ? "text-income" : "text-expense"}`}>
                          {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)} ({pnlPct}%)
                        </p>
                        {livePrice > 0 && (
                          <p className="text-[10px] text-muted-foreground">Preço: {formatCurrency(livePrice)}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => deleteCrypto.mutate(h.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
