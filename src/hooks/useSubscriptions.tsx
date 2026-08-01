import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type RecurringSubscription = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: string;
  category_id: string | null;
  account_id: string | null;
  payment_method_id: string | null;
  next_billing_date: string | null;
  last_charged_at: string | null;
  billing_day: number | null;
  status: string; // active | paused | canceled
  is_active: boolean;
  source_transaction_id: string | null;
  notes: string | null;
  color: string | null;
  icon: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionCharge = {
  id: string;
  subscription_id: string;
  transaction_id: string | null;
  amount: number;
  charge_date: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export const SUBSCRIPTION_FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

export const SUBSCRIPTION_STATUS = [
  { value: "active", label: "Ativa" },
  { value: "paused", label: "Pausada" },
  { value: "canceled", label: "Cancelada" },
];

export function monthlyEquivalent(amount: number, frequency: string) {
  if (frequency === "weekly") return amount * 4.345;
  if (frequency === "quarterly") return amount / 3;
  if (frequency === "yearly") return amount / 12;
  return amount;
}

export function advanceDate(dateStr: string, frequency: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (frequency === "weekly") dt.setDate(dt.getDate() + 7);
  else if (frequency === "quarterly") dt.setMonth(dt.getMonth() + 3);
  else if (frequency === "yearly") dt.setFullYear(dt.getFullYear() + 1);
  else dt.setMonth(dt.getMonth() + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function useSubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["recurring_subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["subscription_charges"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["record_audits"] });
  };

  const query = useQuery({
    queryKey: ["recurring_subscriptions", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("recurring_subscriptions")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as RecurringSubscription[];
    },
    enabled: !!user,
  });

  const addSubscription = useMutation({
    mutationFn: async (sub: Partial<RecurringSubscription> & { name: string; amount: number }) => {
      if (!sub.name?.trim()) throw new Error("Nome é obrigatório");
      if (!sub.amount || sub.amount <= 0) throw new Error("Valor deve ser maior que zero");
      const { error } = await (supabase as any).from("recurring_subscriptions").insert({
        ...sub,
        name: sub.name.trim(),
        frequency: sub.frequency ?? "monthly",
        status: sub.status ?? "active",
        is_active: (sub.status ?? "active") === "active",
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura adicionada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringSubscription> & { id: string }) => {
      const payload: Record<string, any> = { ...updates };
      if (payload.name !== undefined) payload.name = payload.name?.trim();
      if (payload.status !== undefined) payload.is_active = payload.status === "active";
      const { error } = await (supabase as any)
        .from("recurring_subscriptions")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura atualizada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("recurring_subscriptions")
        .update({ deleted_at: new Date().toISOString(), is_active: false, status: "canceled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  /** Lança a cobrança do período atual como despesa e avança a próxima cobrança. */
  const registerCharge = useMutation({
    mutationFn: async ({ sub, date }: { sub: RecurringSubscription; date?: string }) => {
      const chargeDate = date ?? sub.next_billing_date ?? new Date().toISOString().split("T")[0];
      const { data: tx, error } = await (supabase as any)
        .from("transactions")
        .insert({
          user_id: user!.id,
          type: "expense",
          title: sub.name,
          description: sub.name,
          amount: sub.amount,
          category_id: sub.category_id,
          account_id: sub.account_id,
          payment_method_id: sub.payment_method_id,
          payment_method: "pix",
          date: chargeDate,
          is_fixed: true,
          is_recurring: true,
          recurrence_interval: sub.frequency,
          status: "paid",
          subscription_id: sub.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      await (supabase as any).from("subscription_charges").insert({
        user_id: user!.id,
        subscription_id: sub.id,
        transaction_id: tx.id,
        amount: sub.amount,
        charge_date: chargeDate,
        status: "paid",
      });

      const { error: upErr } = await (supabase as any)
        .from("recurring_subscriptions")
        .update({
          last_charged_at: chargeDate,
          next_billing_date: advanceDate(chargeDate, sub.frequency),
        })
        .eq("id", sub.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Cobrança lançada como despesa!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    ...query,
    data: query.data ?? [],
    addSubscription,
    updateSubscription,
    deleteSubscription,
    registerCharge,
  };
}

export function useSubscriptionCharges(subscriptionId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subscription_charges", subscriptionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subscription_charges")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .is("deleted_at", null)
        .order("charge_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SubscriptionCharge[];
    },
    enabled: !!user && !!subscriptionId,
  });
}
