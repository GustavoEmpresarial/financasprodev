import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, ExternalLink, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function Subscription() {
  const { user, loading, subscription, subscriptionLoading, checkSubscription } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error("Erro ao iniciar checkout: " + e.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error("Erro ao abrir portal: " + e.message);
    } finally {
      setPortalLoading(false);
    }
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Ativa", variant: "default" },
    past_due: { label: "Pagamento pendente", variant: "destructive" },
    canceled: { label: "Cancelada", variant: "secondary" },
    inactive: { label: "Inativa", variant: "outline" },
  };

  const currentStatus = statusLabels[subscription.status] || statusLabels.inactive;

  const features = [
    "Dashboard financeiro completo",
    "Controle de transações ilimitado",
    "Metas financeiras e orçamento por categoria",
    "Cartões de crédito e contas a pagar",
    "Investimentos e criptomoedas",
    "Scanner de comprovantes com IA",
    "Assistente por voz",
    "Análises e relatórios avançados",
    "Simulador financeiro",
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-fade-in space-y-6">
        <div className="text-center">
          <Crown className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">FinançasPro Premium</h1>
          <p className="mt-2 text-muted-foreground">Gerencie suas finanças de forma completa e inteligente</p>
        </div>

        {/* Current status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sua Assinatura</CardTitle>
              <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
            </div>
            {subscription.subscriptionEnd && subscription.status === "active" && (
              <CardDescription>
                Próxima cobrança: {new Date(subscription.subscriptionEnd).toLocaleDateString("pt-BR")}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {subscription.subscribed ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Você tem acesso a todas as funcionalidades premium.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleManage} disabled={portalLoading} className="flex-1">
                    {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Gerenciar assinatura
                  </Button>
                  <Button variant="ghost" onClick={checkSubscription} disabled={subscriptionLoading} size="icon">
                    <Loader2 className={`h-4 w-4 ${subscriptionLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">R$ 27,90</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </div>
                <Button onClick={handleCheckout} disabled={checkoutLoading} className="w-full" size="lg">
                  {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                  Assinar agora
                </Button>
                {subscription.status === "past_due" && (
                  <p className="text-sm text-destructive text-center">
                    Seu pagamento está pendente. Regularize para continuar usando.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">O que está incluso</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Button variant="ghost" className="w-full" onClick={() => window.history.back()}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
