import { useState, useMemo } from "react";
import { Calculator, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

export default function Simulator() {
  const [initial, setInitial] = useState(1000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const data = useMemo(() => {
    const monthlyRate = rate / 100 / 12;
    const totalMonths = years * 12;
    const points: { month: number; year: string; total: number; invested: number; interest: number }[] = [];

    let balance = initial;
    let totalInvested = initial;

    for (let m = 0; m <= totalMonths; m++) {
      if (m > 0) {
        balance = balance * (1 + monthlyRate) + monthly;
        totalInvested += monthly;
      }
      if (m % (totalMonths <= 60 ? 1 : totalMonths <= 120 ? 3 : 6) === 0 || m === totalMonths) {
        points.push({
          month: m,
          year: m % 12 === 0 ? `${m / 12}a` : `${Math.floor(m / 12)}a${m % 12}m`,
          total: Math.round(balance),
          invested: Math.round(totalInvested),
          interest: Math.round(balance - totalInvested),
        });
      }
    }
    return points;
  }, [initial, monthly, rate, years]);

  const final = data[data.length - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Simulador de Juros Compostos
        </h1>
        <p className="text-sm text-muted-foreground">Projete o crescimento do seu patrimônio</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Controls */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Parâmetros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Aporte Inicial (R$)</Label>
              <Input
                type="number"
                value={initial}
                onChange={(e) => setInitial(Number(e.target.value))}
                min={0}
                step={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Aporte Mensal (R$)</Label>
              <Input
                type="number"
                value={monthly}
                onChange={(e) => setMonthly(Number(e.target.value))}
                min={0}
                step={50}
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Taxa Anual (%)</Label>
                <span className="text-sm font-semibold text-primary">{rate}%</span>
              </div>
              <Slider
                value={[rate]}
                onValueChange={([v]) => setRate(v)}
                min={1}
                max={30}
                step={0.5}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Poupança ~7%</span>
                <span>CDI ~13%</span>
                <span>Ações ~15-20%</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Período (anos)</Label>
                <span className="text-sm font-semibold text-primary">{years} anos</span>
              </div>
              <Slider
                value={[years]}
                onValueChange={([v]) => setYears(v)}
                min={1}
                max={40}
                step={1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Projeção Patrimonial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(162, 63%, 41%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(162, 63%, 41%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="total" stroke="hsl(162, 63%, 41%)" fill="url(#colorTotal)" strokeWidth={2} name="Total" />
                <Area type="monotone" dataKey="invested" stroke="hsl(199, 89%, 48%)" fill="url(#colorInvested)" strokeWidth={2} name="Investido" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {final && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Acumulado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatCurrency(final.total)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(final.invested)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Juros Acumulados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-income">{formatCurrency(final.interest)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {final.invested > 0 ? ((final.interest / final.invested) * 100).toFixed(1) : 0}% de ganho sobre o investido
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
