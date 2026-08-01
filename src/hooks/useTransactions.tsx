import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Transaction = {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  amount: number;
  category_id: string | null;
  subcategory_id: string | null;
  description: string | null;
  notes: string | null;
  date: string;
  is_fixed: boolean;
  payment_method: string;
  payment_method_id: string | null;
  credit_card_id: string | null;
  account_id: string | null;
  status: string;
  is_recurring: boolean;
  recurrence_interval: string | null;
  paid_at: string | null;
  subscription_id: string | null;
  tags: string[];
  attachments: any[];
  installment_count: number | null;
  installment_number: number | null;
  installment_group: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: { name: string; icon: string | null; color: string | null } | null;
  credit_cards?: { name: string; color: string | null } | null;
};

export type TransactionInput = {
  type?: string;
  title?: string | null;
  amount: number;
  category_id?: string | null;
  subcategory_id?: string | null;
  description?: string | null;
  notes?: string | null;
  date: string;
  is_fixed?: boolean;
  payment_method?: string;
  payment_method_id?: string | null;
  credit_card_id?: string | null;
  account_id?: string | null;
  status?: string;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  tags?: string[];
  subscription_id?: string | null;
  installment_count?: number | null;
  installment_number?: number | null;
  installment_group?: string | null;
};

export const TRANSACTION_STATUS = [
  { value: "paid", label: "Pago" },
  { value: "pending", label: "Pendente" },
  { value: "scheduled", label: "Agendado" },
  { value: "canceled", label: "Cancelado" },
];

export const RECURRENCE_INTERVALS = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

const SELECT = "*, categories!transactions_category_id_fkey(name, icon, color), credit_cards(name, color)";

export function useTransactions(month?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const startOfMonth = month ? `${month}-01` : undefined;
  const endOfMonth = month
    ? (() => {
        const [y, m] = month.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        return `${month}-${String(lastDay).padStart(2, "0")}`;
      })()
    : undefined;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
    queryClient.invalidateQueries({ queryKey: ["recurring_subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["record_audits"] });
  };

  const query = useQuery({
    queryKey: ["transactions", user?.id, month],
    queryFn: async () => {
      let q = (supabase as any)
        .from("transactions")
        .select(SELECT)
        .is("deleted_at", null)
        .order("date", { ascending: false });

      if (startOfMonth && endOfMonth) {
        q = q.gte("date", startOfMonth).lte("date", endOfMonth);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
    enabled: !!user,
  });

  const sanitize = (tx: TransactionInput) => {
    if (!tx.amount || tx.amount <= 0) throw new Error("Valor deve ser maior que zero");
    if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) throw new Error("Data inválida");
    return {
      type: tx.type ?? "expense",
      title: tx.title?.trim() || tx.description?.trim() || null,
      amount: tx.amount,
      category_id: tx.category_id || null,
      subcategory_id: tx.subcategory_id || null,
      description: tx.description?.trim() || null,
      notes: tx.notes?.trim() || null,
      date: tx.date,
      is_fixed: tx.is_fixed ?? false,
      payment_method: tx.payment_method ?? "pix",
      payment_method_id: tx.payment_method_id || null,
      credit_card_id: tx.credit_card_id || null,
      account_id: tx.account_id || null,
      status: tx.status ?? "paid",
      is_recurring: tx.is_recurring ?? false,
      recurrence_interval: tx.is_recurring ? tx.recurrence_interval ?? "monthly" : null,
      paid_at: (tx.status ?? "paid") === "paid" ? new Date().toISOString() : null,
      tags: tx.tags ?? [],
      subscription_id: tx.subscription_id || null,
      installment_count: tx.installment_count ?? null,
      installment_number: tx.installment_number ?? null,
      installment_group: tx.installment_group ?? null,
    };
  };

  /** Procura assinatura ativa equivalente (mesmo nome / valor / recorrência). */
  const findSubscriptionConflict = async (name: string, amount: number, frequency: string) => {
    if (!user || !name?.trim()) return null;
    const { data } = await (supabase as any)
      .from("recurring_subscriptions")
      .select("*")
      .is("deleted_at", null)
      .eq("status", "active")
      .ilike("name", name.trim());
    const list = (data ?? []) as any[];
    if (list.length === 0) return null;
    const exact = list.find((s) => Number(s.amount) === Number(amount) && s.frequency === frequency);
    return exact ?? list[0];
  };

  const addTransaction = useMutation({
    mutationFn: async (
      tx: TransactionInput & { create_subscription?: boolean }
    ) => {
      const { create_subscription, ...rest } = tx;
      const payload = sanitize(rest);
      let subscriptionId = payload.subscription_id;

      if (create_subscription && payload.is_recurring) {
        const { data: sub, error: subErr } = await (supabase as any)
          .from("recurring_subscriptions")
          .insert({
            user_id: user!.id,
            name: payload.title ?? "Despesa recorrente",
            amount: payload.amount,
            frequency: payload.recurrence_interval ?? "monthly",
            category_id: payload.category_id,
            account_id: payload.account_id,
            payment_method_id: payload.payment_method_id,
            next_billing_date: payload.date,
            billing_day: Number(payload.date.split("-")[2]),
            is_active: true,
            status: "active",
            notes: payload.notes,
          })
          .select("id")
          .single();
        if (subErr) throw subErr;
        subscriptionId = sub.id;
      }

      const { data: inserted, error } = await (supabase as any)
        .from("transactions")
        .insert({ ...payload, subscription_id: subscriptionId, user_id: user!.id })
        .select("id")
        .single();
      if (error) throw error;

      if (subscriptionId) {
        await (supabase as any).from("subscription_charges").insert({
          user_id: user!.id,
          subscription_id: subscriptionId,
          transaction_id: inserted.id,
          amount: payload.amount,
          charge_date: payload.date,
          status: payload.status === "paid" ? "paid" : "pending",
        });
        if (create_subscription) {
          await (supabase as any)
            .from("recurring_subscriptions")
            .update({ source_transaction_id: inserted.id, last_charged_at: payload.date })
            .eq("id", subscriptionId);
        }
      }
      return inserted.id as string;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Despesa registrada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TransactionInput> & { id: string }) => {
      const payload: Record<string, any> = { ...updates };
      if (payload.amount !== undefined && payload.amount <= 0) throw new Error("Valor deve ser maior que zero");
      if (payload.title !== undefined) payload.title = payload.title?.trim() || null;
      if (payload.description !== undefined) payload.description = payload.description?.trim() || null;
      if (payload.notes !== undefined) payload.notes = payload.notes?.trim() || null;
      if (payload.is_recurring === false) payload.recurrence_interval = null;
      const { error } = await (supabase as any)
        .from("transactions")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Despesa atualizada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const duplicateTransaction = useMutation({
    mutationFn: async (tx: Transaction) => {
      const { error } = await (supabase as any).from("transactions").insert({
        user_id: user!.id,
        type: tx.type,
        title: tx.title,
        amount: tx.amount,
        category_id: tx.category_id,
        subcategory_id: tx.subcategory_id,
        description: tx.description,
        notes: tx.notes,
        date: new Date().toISOString().split("T")[0],
        is_fixed: tx.is_fixed,
        payment_method: tx.payment_method,
        payment_method_id: tx.payment_method_id,
        credit_card_id: tx.credit_card_id,
        account_id: tx.account_id,
        status: tx.status,
        tags: tx.tags ?? [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Despesa duplicada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("transactions")
        .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Status atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  /** Converte uma despesa existente em recorrente, criando a assinatura vinculada. */
  const convertToRecurring = useMutation({
    mutationFn: async ({ tx, frequency }: { tx: Transaction; frequency: string }) => {
      const name = tx.title || tx.description || tx.categories?.name || "Despesa recorrente";
      const { data: sub, error } = await (supabase as any)
        .from("recurring_subscriptions")
        .insert({
          user_id: user!.id,
          name,
          amount: tx.amount,
          frequency,
          category_id: tx.category_id,
          account_id: tx.account_id,
          payment_method_id: tx.payment_method_id,
          next_billing_date: tx.date,
          billing_day: Number(tx.date.split("-")[2]),
          is_active: true,
          status: "active",
          source_transaction_id: tx.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      await (supabase as any)
        .from("transactions")
        .update({ is_recurring: true, recurrence_interval: frequency, subscription_id: sub.id })
        .eq("id", tx.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Despesa convertida em assinatura recorrente!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("transactions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Despesa removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from("transactions")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      invalidate();
      toast.success(`${ids.length} despesa(s) removida(s)!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, any> }) => {
      const { error } = await (supabase as any).from("transactions").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Despesas atualizadas!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    ...query,
    data: query.data ?? [],
    addTransaction,
    updateTransaction,
    duplicateTransaction,
    deleteTransaction,
    convertToRecurring,
    setStatus,
    bulkDelete,
    bulkUpdate,
    findSubscriptionConflict,
  };
}

/** Retrocompatibilidade: categorias do usuário. */
export function useCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["categories", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("categories")
        .select("*")
        .is("deleted_at", null)
        .not("user_id", "is", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
