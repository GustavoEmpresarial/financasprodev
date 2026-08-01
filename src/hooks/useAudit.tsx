import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AuditEntry = {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string;
  action: "create" | "update" | "delete";
  changed_fields: string[];
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  created_at: string;
};

export const FIELD_LABELS: Record<string, string> = {
  title: "Nome",
  name: "Nome",
  source_name: "Fonte",
  amount: "Valor",
  category_id: "Categoria",
  subcategory_id: "Subcategoria",
  description: "Descrição",
  notes: "Observações",
  date: "Data",
  due_date: "Vencimento",
  payment_date: "Data de pagamento",
  status: "Status",
  priority: "Prioridade",
  is_paid: "Pago",
  is_received: "Recebido",
  is_recurring: "Recorrente",
  recurrence_interval: "Frequência",
  frequency: "Frequência",
  payment_method: "Método de pagamento",
  payment_method_id: "Método de pagamento",
  account_id: "Conta",
  credit_card_id: "Cartão",
  tags: "Etiquetas",
  paid_amount: "Valor pago",
  deleted_at: "Exclusão",
  next_billing_date: "Próxima cobrança",
  is_active: "Ativo",
  color: "Cor",
  icon: "Ícone",
  type: "Tipo",
  balance: "Saldo",
  installment_count: "Parcelas",
};

export function useRecordHistory(table: string, recordId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["record_audits", table, recordId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("record_audits")
        .select("*")
        .eq("table_name", table)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
    enabled: !!user && !!recordId,
  });
}

export function useRecentActivity(limit = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["record_audits", "recent", limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("record_audits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
    enabled: !!user,
  });
}
