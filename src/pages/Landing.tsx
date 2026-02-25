import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wallet,
  ArrowRight,
  BarChart3,
  Shield,
  Target,
  TrendingUp,
  ArrowDownUp,
  PieChart,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Dashboard Inteligente",
    description: "Visualize receitas, despesas e saldo em tempo real com gráficos interativos.",
  },
  {
    icon: ArrowDownUp,
    title: "Controle Total",
    description: "Registre transações por categoria, marque como fixas ou variáveis.",
  },
  {
    icon: PieChart,
    title: "Relatórios Detalhados",
    description: "Gráficos de pizza e barras para entender seus gastos por categoria.",
  },
  {
    icon: Target,
    title: "Metas Financeiras",
    description: "Defina objetivos mensais e acompanhe seu progresso em tempo real.",
  },
  {
    icon: Shield,
    title: "Seguro & Privado",
    description: "Seus dados são protegidos com autenticação segura e criptografia.",
  },
  {
    icon: Zap,
    title: "Rápido & Intuitivo",
    description: "Interface limpa inspirada nos melhores apps bancários do mercado.",
  },
];

const stats = [
  { value: "100%", label: "Gratuito" },
  { value: "∞", label: "Transações" },
  { value: "24/7", label: "Disponível" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">FinançasPro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">
                Começar grátis
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center animate-fade-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Controle financeiro simplificado
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Suas finanças sob{" "}
            <span className="text-primary">controle total</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Registre receitas e despesas, visualize relatórios inteligentes e alcance suas metas financeiras — tudo em um só lugar.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/auth">
              <Button size="lg" className="px-8 text-base">
                Criar conta gratuita
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-16 grid max-w-md grid-cols-3 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-primary">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto mb-12 max-w-lg text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tudo que você precisa para organizar suas finanças
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Funcionalidades pensadas para simplificar seu dia a dia financeiro.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="glass-card transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl rounded-2xl bg-primary p-10 text-center sm:p-14">
          <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
            Comece a organizar suas finanças hoje
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-primary-foreground/80">
            Cadastre-se gratuitamente e tenha controle total sobre seu dinheiro.
          </p>
          <Link to="/auth">
            <Button
              size="lg"
              variant="secondary"
              className="mt-6 px-8 text-base font-semibold"
            >
              Começar agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">FinançasPro</span>
          </div>
          <p>© {new Date().getFullYear()} FinançasPro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
