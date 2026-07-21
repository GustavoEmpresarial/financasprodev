import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Wallet, ArrowRight, ArrowUpRight, ArrowDownRight, BarChart3, Shield, Target,
  TrendingUp, CreditCard, PiggyBank, Bell, FileDown, Repeat, LineChart,
  CheckCircle2, Sparkles, Lock, DatabaseBackup, Smartphone, Zap, X, Check,
  Star, Landmark, Bitcoin, Menu,
} from "lucide-react";
import { useEffect, useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function AnimatedCounter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const dur = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span>{prefix}{n.toLocaleString("pt-BR")}{suffix}</span>;
}

/* ---------- Dashboard mockup ---------- */
function DashboardMockup() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-primary/30 via-accent/20 to-transparent blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden"
      >
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">FinançasPro — Painel</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 p-5">
          {/* Sidebar */}
          <div className="col-span-3 space-y-1.5">
            {["Painel", "Despesas", "Receitas", "Cartões", "Investimentos", "Metas"].map((l, i) => (
              <div
                key={l}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] ${
                  i === 0 ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                {l}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="col-span-9 space-y-4">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Saldo", value: "R$ 24.580", tone: "text-foreground", up: true, delta: "+12,4%" },
                { label: "Receitas", value: "R$ 8.420", tone: "text-emerald-600", up: true, delta: "+8,2%" },
                { label: "Despesas", value: "R$ 3.190", tone: "text-rose-600", up: false, delta: "-4,1%" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-border/60 bg-background p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <p className={`mt-1 text-sm font-bold ${k.tone}`}>{k.value}</p>
                  <p className={`mt-0.5 flex items-center gap-0.5 text-[10px] ${k.up ? "text-emerald-600" : "text-rose-600"}`}>
                    {k.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {k.delta}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-border/60 bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold">Evolução</p>
                <div className="flex gap-1">
                  {["1M", "3M", "6M", "1A"].map((t, i) => (
                    <span key={t} className={`rounded px-1.5 py-0.5 text-[9px] ${i === 2 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>{t}</span>
                  ))}
                </div>
              </div>
              <svg viewBox="0 0 300 90" className="h-24 w-full">
                <defs>
                  <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, delay: 0.4, ease: "easeOut" }}
                  d="M0,70 C30,60 50,40 80,45 C110,50 130,25 165,30 C200,35 220,55 250,40 C275,28 290,20 300,15"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0,70 C30,60 50,40 80,45 C110,50 130,25 165,30 C200,35 220,55 250,40 C275,28 290,20 300,15 L300,90 L0,90 Z"
                  fill="url(#lg)"
                />
              </svg>
            </div>

            {/* Two mini panels */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-background p-3">
                <p className="text-[10px] font-semibold text-muted-foreground">Categorias</p>
                <div className="mt-2 space-y-1.5">
                  {[
                    { l: "Alimentação", v: 68, c: "bg-primary" },
                    { l: "Transporte", v: 42, c: "bg-accent" },
                    { l: "Lazer", v: 28, c: "bg-amber-400" },
                  ].map((r) => (
                    <div key={r.l}>
                      <div className="flex justify-between text-[9px] text-muted-foreground"><span>{r.l}</span><span>{r.v}%</span></div>
                      <div className="mt-0.5 h-1 rounded-full bg-muted overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${r.v}%` }} transition={{ duration: 1, delay: 0.4 }} viewport={{ once: true }} className={`h-full ${r.c}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background p-3">
                <p className="text-[10px] font-semibold text-muted-foreground">Movimentos</p>
                <div className="mt-2 space-y-1.5">
                  {[
                    { l: "iFood", v: "-R$ 42", up: false },
                    { l: "Salário", v: "+R$ 5.200", up: true },
                    { l: "Uber", v: "-R$ 18", up: false },
                  ].map((t) => (
                    <div key={t.l} className="flex items-center justify-between text-[10px]">
                      <span className="text-foreground/80">{t.l}</span>
                      <span className={t.up ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>{t.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating cards */}
      <motion.div
        initial={{ opacity: 0, x: -20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="absolute -left-4 top-24 hidden rounded-2xl border border-border/60 bg-card p-3 shadow-xl md:block"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Receita</p>
            <p className="text-sm font-bold text-emerald-600">+R$ 8.420</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="absolute -right-4 top-44 hidden rounded-2xl border border-border/60 bg-card p-3 shadow-xl md:block"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Cartão Nubank</p>
            <p className="text-sm font-bold">R$ 1.240 / 5.000</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        className="absolute -bottom-6 left-1/2 hidden -translate-x-1/2 rounded-2xl border border-border/60 bg-card p-3 shadow-xl md:block"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
            <Target className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Meta: Viagem</p>
            <p className="text-sm font-bold">78% concluído</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Data ---------- */
const trustItems = [
  "Cadastro Gratuito",
  "Transações Ilimitadas",
  "Backup Automático",
  "Criptografia dos Dados",
  "Acesso em qualquer dispositivo",
  "Interface Moderna",
];

const features = [
  { icon: BarChart3, title: "Painel Inteligente", desc: "Visualize toda sua vida financeira em tempo real." },
  { icon: Repeat, title: "Receitas e Despesas", desc: "Cadastre movimentações por categoria." },
  { icon: CreditCard, title: "Cartões de Crédito", desc: "Controle limites, parcelas, faturas e fechamento." },
  { icon: Landmark, title: "Contas Bancárias", desc: "Gerencie várias contas em um só lugar." },
  { icon: Bitcoin, title: "Investimentos", desc: "Bitcoin, Ethereum, ações, FIIs, Tesouro, CDB e fundos." },
  { icon: Target, title: "Metas Financeiras", desc: "Crie objetivos e acompanhe sua evolução." },
  { icon: LineChart, title: "Relatórios", desc: "Gráficos modernos: pizza, linha, área e barras." },
  { icon: PiggyBank, title: "Assinaturas", desc: "Netflix, Spotify, Prime, ChatGPT, Adobe e mais." },
  { icon: Bell, title: "Alertas", desc: "Avisos de contas, cartões, metas e orçamento." },
  { icon: FileDown, title: "Exportação", desc: "Exporte para PDF, Excel, CSV e faça backup." },
];

const compareRows = [
  "Painel completo", "Cartões de crédito", "Investimentos", "Metas",
  "Relatórios", "Backup", "Alertas", "Multi dispositivos",
];

const testimonials = [
  { name: "Camila R.", role: "Designer", quote: "Finalmente consegui organizar minhas finanças." },
  { name: "Rafael S.", role: "Desenvolvedor", quote: "Muito melhor do que usar planilhas." },
  { name: "Juliana M.", role: "Empreendedora", quote: "Consigo controlar todos os meus cartões em um só lugar." },
];

/* ---------- Page ---------- */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[500px] w-[500px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Nav */}
      <header className={`sticky top-0 z-50 transition-all ${scrolled ? "bg-background/80 backdrop-blur-lg border-b" : "bg-transparent"}`}>
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">FinançasPro</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#recursos" className="text-sm text-muted-foreground hover:text-foreground transition">Recursos</a>
            <a href="#dashboard" className="text-sm text-muted-foreground hover:text-foreground transition">Painel</a>
            <a href="#seguranca" className="text-sm text-muted-foreground hover:text-foreground transition">Segurança</a>
            <a href="#depoimentos" className="text-sm text-muted-foreground hover:text-foreground transition">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:block"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/auth"><Button size="sm" className="rounded-full">Criar conta<ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
            <button className="md:hidden p-2" aria-label="Menu"><Menu className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border bg-card/50 px-4 py-1.5 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Sua vida financeira em um só painel</span>
            </motion.div>
            <motion.h1 variants={fadeUp} className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.05]">
              Tenha controle total do{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">seu dinheiro.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Pare de usar planilhas e descubra exatamente para onde seu dinheiro está indo. O FinançasPro reúne receitas, despesas, cartões, investimentos, metas e relatórios inteligentes em um único painel.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="rounded-full px-7 text-base shadow-lg shadow-primary/20">
                  Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="rounded-full px-7 text-base">Entrar</Button>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-10 grid max-w-md grid-cols-3 gap-6">
              <div><p className="text-2xl font-bold text-primary"><AnimatedCounter to={100} suffix="%" /></p><p className="text-xs text-muted-foreground mt-1">Gratuito</p></div>
              <div><p className="text-2xl font-bold text-primary"><AnimatedCounter to={50} suffix="+" /></p><p className="text-xs text-muted-foreground mt-1">Recursos</p></div>
              <div><p className="text-2xl font-bold text-primary">24/7</p><p className="text-xs text-muted-foreground mt-1">Disponível</p></div>
            </motion.div>
          </motion.div>

          <div className="relative">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <Section className="border-y bg-muted/30 py-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {trustItems.map((t) => (
              <motion.div key={t} variants={fadeUp} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{t}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Problema */}
      <Section className="container py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div variants={fadeUp}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Você realmente sabe para onde seu dinheiro está indo?
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              A maioria das pessoas termina o mês sem entender onde o salário sumiu. Sem controle, é fácil:
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Esquecer contas e pagar juros desnecessários",
                "Gastar mais do que imagina no cartão",
                "Perder o controle das faturas e parcelas",
                "Não acompanhar seus investimentos",
                "Nunca alcançar suas metas financeiras",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                    <X className="h-3 w-3 text-rose-500" />
                  </div>
                  <span className="text-sm text-foreground/80">{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div variants={fadeUp}>
            <DashboardMockup />
          </motion.div>
        </div>
      </Section>

      {/* Recursos */}
      <Section className="border-t bg-muted/20 py-24">
        <div className="container">
          <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Recursos</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Tudo o que você precisa em um só lugar</h2>
            <p className="mt-4 text-muted-foreground">Uma plataforma completa, feita para quem leva a vida financeira a sério.</p>
          </motion.div>

          <div id="recursos" className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="group rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-xl"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Dashboard showcase */}
      <Section id="dashboard" className="container py-24">
        <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Interface</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Um painel que você vai amar usar</h2>
          <p className="mt-4 text-muted-foreground">Design moderno, dados em tempo real e navegação intuitiva.</p>
        </motion.div>
        <motion.div variants={fadeUp} className="mx-auto mt-14 max-w-5xl">
          <DashboardMockup />
        </motion.div>
      </Section>

      {/* Como funciona */}
      <Section className="border-t bg-muted/20 py-24">
        <div className="container">
          <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Como funciona</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Comece em 4 passos simples</h2>
          </motion.div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-4">
            {[
              { n: "01", t: "Criar conta", d: "Cadastro rápido e gratuito." },
              { n: "02", t: "Cadastrar contas", d: "Bancos, carteiras e cartões." },
              { n: "03", t: "Registrar movimentos", d: "Receitas, despesas e metas." },
              { n: "04", t: "Acompanhar evolução", d: "Relatórios e insights automáticos." },
            ].map((s, i) => (
              <motion.div key={s.n} variants={fadeUp} className="relative rounded-2xl border border-border/60 bg-card p-6">
                <div className="text-4xl font-extrabold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">{s.n}</div>
                <h3 className="mt-3 font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
                {i < 3 && <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground/40 md:block" />}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Segurança */}
      <Section id="seguranca" className="container py-24">
        <div className="mx-auto max-w-5xl rounded-3xl border border-border/60 bg-gradient-to-br from-card to-muted/30 p-10 lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div variants={fadeUp}>
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Segurança</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Seus dados estão protegidos.</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Utilizamos as melhores práticas do mercado para garantir que suas informações fiquem seguras e privadas.
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
              {[
                { i: Lock, t: "Criptografia" },
                { i: Shield, t: "Sessões seguras" },
                { i: DatabaseBackup, t: "Backup automático" },
                { i: CheckCircle2, t: "Autenticação segura" },
                { i: Smartphone, t: "Privacidade total" },
                { i: Zap, t: "Alta performance" },
              ].map((x) => (
                <div key={x.t} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <x.i className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{x.t}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Comparativo */}
      <Section className="border-t bg-muted/20 py-24">
        <div className="container">
          <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Comparativo</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">FinançasPro vs. Planilhas</h2>
          </motion.div>
          <motion.div variants={fadeUp} className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-border/60 bg-card">
            <div className="grid grid-cols-3 border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wide">
              <div className="p-4">Recurso</div>
              <div className="p-4 text-center text-primary">FinançasPro</div>
              <div className="p-4 text-center text-muted-foreground">Planilhas</div>
            </div>
            {compareRows.map((r, i) => (
              <div key={r} className={`grid grid-cols-3 items-center text-sm ${i % 2 ? "bg-muted/20" : ""}`}>
                <div className="p-4 font-medium">{r}</div>
                <div className="p-4 text-center"><Check className="mx-auto h-5 w-5 text-primary" /></div>
                <div className="p-4 text-center"><X className="mx-auto h-5 w-5 text-muted-foreground/60" /></div>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* Depoimentos */}
      <Section id="depoimentos" className="container py-24">
        <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Depoimentos</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">O que dizem nossos usuários</h2>
        </motion.div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <motion.div key={t.name} variants={fadeUp} whileHover={{ y: -4 }} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex gap-0.5 text-amber-400">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/85">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-semibold text-primary-foreground">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* CTA Final */}
      <Section className="container py-24">
        <motion.div variants={fadeUp} className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-12 text-center lg:p-16">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl lg:text-5xl">Comece gratuitamente hoje.</h2>
            <p className="mx-auto mt-4 max-w-lg text-primary-foreground/90">
              Organize sua vida financeira em poucos minutos.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="mt-8 rounded-full px-8 text-base font-semibold shadow-xl">
                Criar Conta Gratuitamente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-4 text-xs text-primary-foreground/70">Sem cartão de crédito. Sem compromisso.</p>
          </div>
        </motion.div>
      </Section>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-14">
        <div className="container">
          <div className="grid gap-10 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Wallet className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">FinançasPro</span>
              </div>
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                A plataforma completa para organizar suas finanças pessoais.
              </p>
            </div>
            {[
              { t: "Produto", l: ["Recursos", "Segurança", "Painel"] },
              { t: "Empresa", l: ["Sobre", "Contato", "Ajuda"] },
              { t: "Legal", l: ["Política de Privacidade", "Termos de Uso"] },
            ].map((c) => (
              <div key={c.t}>
                <p className="text-sm font-semibold">{c.t}</p>
                <ul className="mt-4 space-y-2.5">
                  {c.l.map((i) => (
                    <li key={i}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">{i}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} FinançasPro. Todos os direitos reservados.</p>
            <p>Feito com <TrendingUp className="inline h-3 w-3 text-primary" /> no Brasil.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
