import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Bill = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  is_recurring: boolean;
  recurrence_interval: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  account_id: string | null;
  payment_method_id: string | null;
  priority: string;
  status: string;
  paid_amount: number;
  installment_count: number | null;
  installment_number: number | null;
  installment_group: string | null;
  tags: string[];
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export const BILL_STATUS = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "overdue", label: "Atrasado" },
  { value: "partial", label: "Parcialmente pago" },
  { value: "canceled", label: "Cancelado" },
];

export const BILL_PRIORITIES = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

export type BillInput = {
  title: string;
  amount: number;
  due_date: string;
  payment_date?: string | null;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  account_id?: string | null;
  payment_method_id?: string | null;
  priority?: string;
  status?: string;
  paid_amount?: number;
  installment_count?: number | null;
  notes?: string | null;
  tags?: string[];
};

function addMonths(dateStr: string, months: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1 + months, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function useBills(month?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["bills"] });
    queryClient.invalidateQueries({ queryKey: ["record_audits"] });
  };

  const query = useQuery({
    queryKey: ["bills", user?.id, month],
    queryFn: async () => {
      let q = (supabase as any)
        .from("bills")
        .select("*")
        .is("deleted_at", null)
        .order("due_date", { ascending: true });

      if (month) {
        const start = `${month}-01`;
        const [y, m] = month.split("-").map(Number);
        const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
        q = q.gte("due_date", start).lte("due_date", end);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Bill[];
    },
    enabled: !!user,
  });

  const sanitize = (bill: BillInput) => {
    if (!bill.title?.trim()) throw new Error("Nome é obrigatório");
    if (!bill.amount || bill.amount <= 0) throw new Error("Valor deve ser maior que zero");
    if (!bill.due_date) throw new Error("Data de vencimento é obrigatória");
    return {
      title: bill.title.trim(),
      amount: bill.amount,
      due_date: bill.due_date,
      payment_date: bill.payment_date || null,
      is_recurring: bill.is_recurring ?? false,
      recurrence_interval: bill.is_recurring ? bill.recurrence_interval ?? "monthly" : null,
      category_id: bill.category_id || null,
      subcategory_id: bill.subcategory_id || null,
      account_id: bill.account_id || null,
      payment_method_id: bill.payment_method_id || null,
      priority: bill.priority ?? "medium",
      status: bill.status ?? "pending",
      paid_amount: bill.paid_amount ?? 0,
      notes: bill.notes?.trim() || null,
      tags: bill.tags ?? [],
      is_paid: (bill.status ?? "pending") === "paid",
    };
  };

  const addBill = useMutation({
    mutationFn: async (bill: BillInput) => {
      const payload = sanitize(bill);
      const parcels = bill.installment_count && bill.installment_count > 1 ? bill.installment_count : 1;
      if (parcels > 1) {
        const group = crypto.randomUUID();
        const each = Math.round((payload.amount / parcels) * 100) / 100;
        const rows = Array.from({ length: parcels }, (_, i) => ({
          ...payload,
          user_id: user!.id,
          amount: each,
          due_date: addMonths(payload.due_date, i),
          installment_count: parcels,
          installment_number: i + 1,
          installment_group: group,
          title: `${payload.title} (${i + 1}/${parcels})`,
        }));
        const { error } = await (supabase as any).from("bills").insert(rows);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("bills").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Conta adicionada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateBill = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BillInput> & { id: string }) => {
      const payload: Record<string, any> = { ...updates };
      if (payload.title !== undefined) payload.title = payload.title?.trim();
      if (payload.amount !== undefined && payload.amount <= 0) throw new Error("Valor deve ser maior que zero");
      if (payload.status !== undefined) payload.is_paid = payload.status === "paid";
      if (payload.is_recurring === false) payload.recurrence_interval = null;
      delete payload.installment_count;
      const { error } = await (supabase as any).from("bills").update(payload).eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Conta atualizada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const duplicateBill = useMutation({
    mutationFn: async (bill: Bill) => {
      const { error } = await (supabase as any).from("bills").insert({
        user_id: user!.id,
        title: bill.title,
        amount: bill.amount,
        due_date: addMonths(bill.due_date, 1),
        category_id: bill.category_id,
        subcategory_id: bill.subcategory_id,
        account_id: bill.account_id,
        payment_method_id: bill.payment_method_id,
        priority: bill.priority,
        status: "pending",
        is_paid: false,
        paid_amount: 0,
        notes: bill.notes,
        tags: bill.tags ?? [],
        is_recurring: bill.is_recurring,
        recurrence_interval: bill.recurrence_interval,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Conta duplicada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, amount, paid_amount }: { id: string; status: string; amount?: number; paid_amount?: number }) => {
      const isPaid = status === "paid";
      const { error } = await (supabase as any)
        .from("bills")
        .update({
          status,
          is_paid: isPaid,
          paid_at: isPaid ? new Date().toISOString() : null,
          payment_date: isPaid ? new Date().toISOString().split("T")[0] : null,
          paid_amount: paid_amount ?? (isPaid ? amount ?? 0 : 0),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Status atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  /** Retrocompatibilidade com a versão anterior do módulo. */
  const togglePaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await (supabase as any)
        .from("bills")
        .update({
          is_paid,
          status: is_paid ? "paid" : "pending",
          paid_at: is_paid ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (err: any) => toast.error(err.message),
  });

  const postponeBill = useMutation({
    mutationFn: async ({ id, days, due_date }: { id: string; days: number; due_date: string }) => {
      const dt = new Date(due_date + "T12:00:00");
      dt.setDate(dt.getDate() + days);
      const { error } = await (supabase as any)
        .from("bills")
        .update({ due_date: dt.toISOString().split("T")[0], status: "pending" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Vencimento adiado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const splitBill = useMutation({
    mutationFn: async ({ bill, parcels }: { bill: Bill; parcels: number }) => {
      if (parcels < 2) throw new Error("Informe 2 ou mais parcelas");
      const group = crypto.randomUUID();
      const each = Math.round((bill.amount / parcels) * 100) / 100;
      const base = bill.title.replace(/\s\(\d+\/\d+\)$/, "");
      const rows = Array.from({ length: parcels }, (_, i) => ({
        user_id: user!.id,
        title: `${base} (${i + 1}/${parcels})`,
        amount: each,
        due_date: addMonths(bill.due_date, i),
        category_id: bill.category_id,
        subcategory_id: bill.subcategory_id,
        account_id: bill.account_id,
        payment_method_id: bill.payment_method_id,
        priority: bill.priority,
        status: "pending",
        is_paid: false,
        paid_amount: 0,
        notes: bill.notes,
        installment_count: parcels,
        installment_number: i + 1,
        installment_group: group,
        is_recurring: false,
      }));
      const { error } = await (supabase as any).from("bills").insert(rows);
      if (error) throw error;
      const { error: delErr } = await (supabase as any)
        .from("bills")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", bill.id);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Conta parcelada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const makeRecurring = useMutation({
    mutationFn: async ({ bill, frequency }: { bill: Bill; frequency: string }) => {
      const { error } = await (supabase as any)
        .from("bills")
        .update({ is_recurring: true, recurrence_interval: frequency })
        .eq("id", bill.id);
      if (error) throw error;
      const { data: existing } = await (supabase as any)
        .from("recurring_subscriptions")
        .select("id")
        .is("deleted_at", null)
        .eq("status", "active")
        .ilike("name", bill.title);
      if (!existing || existing.length === 0) {
        const { error: subErr } = await (supabase as any).from("recurring_subscriptions").insert({
          user_id: user!.id,
          name: bill.title,
          amount: bill.amount,
          frequency,
          category_id: bill.category_id,
          account_id: bill.account_id,
          payment_method_id: bill.payment_method_id,
          next_billing_date: bill.due_date,
          billing_day: Number(bill.due_date.split("-")[2]),
          is_active: true,
          status: "active",
        });
        if (subErr) throw subErr;
      }
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["recurring_subscriptions"] });
      toast.success("Conta tornada recorrente!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("bills")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Conta removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from("bills")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      invalidate();
      toast.success(`${ids.length} conta(s) removida(s)!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const isPaid = status === "paid";
      const { error } = await (supabase as any)
        .from("bills")
        .update({ status, is_paid: isPaid, paid_at: isPaid ? new Date().toISOString() : null })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Contas atualizadas!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    ...query,
    data: query.data ?? [],
    addBill,
    updateBill,
    duplicateBill,
    deleteBill,
    setStatus,
    togglePaid,
    postponeBill,
    splitBill,
    makeRecurring,
    bulkDelete,
    bulkStatus,
  };
}
