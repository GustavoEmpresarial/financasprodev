import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Earning = {
  id: string;
  user_id: string;
  source_name: string;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
  category: string;
  linked_investment_id: string | null;
  linked_traditional_investment_id: string | null;
  created_at: string;
  updated_at: string;
};

export const EARNING_CATEGORIES = [
  { value: "dividends", label: "Dividendos" },
  { value: "daily_yield", label: "Rendimento Diário" },
  { value: "sale_profit", label: "Lucro de Venda" },
  { value: "reward", label: "Recompensa" },
  { value: "airdrop", label: "Airdrop" },
  { value: "staking", label: "Staking" },
  { value: "cashback", label: "Cashback" },
  { value: "referral", label: "Indicação" },
  { value: "other", label: "Outro" },
] as const;

export function useEarnings(month?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const startOfMonth = month ? `${month}-01` : undefined;
  const endOfMonth = month
    ? (() => {
        const [y, m] = month.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        return `${month}-${String(lastDay).padStart(2, "0")}`;
      })()
    : undefined;

  const query = useQuery({
    queryKey: ["earnings", user?.id, month],
    queryFn: async () => {
      let q = (supabase as any).from("earnings").select("*").order("date", { ascending: false });
      if (startOfMonth && endOfMonth) {
        q = q.gte("date", startOfMonth).lte("date", endOfMonth);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Earning[];
    },
    enabled: !!user,
  });

  const allEarnings = useQuery({
    queryKey: ["earnings-all", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("earnings").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data as Earning[];
    },
    enabled: !!user,
  });

  const addEarning = useMutation({
    mutationFn: async (e: Omit<Earning, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!e.source_name || e.source_name.trim().length === 0) throw new Error("Nome da fonte é obrigatório");
      if (e.source_name.trim().length > 200) throw new Error("Nome deve ter no máximo 200 caracteres");
      if (e.amount <= 0) throw new Error("Valor deve ser maior que zero");
      if (!e.date) throw new Error("Data é obrigatória");
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(e.date)) throw new Error("Formato de data inválido");
      if (e.description && e.description.length > 1000) throw new Error("Descrição deve ter no máximo 1000 caracteres");

      // Duplicate check
      const { data: existing } = await (supabase as any)
        .from("earnings")
        .select("id")
        .eq("source_name", e.source_name.trim())
        .eq("date", e.date)
        .eq("amount", e.amount)
        .eq("user_id", user.id);
      if (existing && existing.length > 0) {
        throw new Error("Já existe um ganho idêntico (mesma fonte, data e valor).");
      }

      const { error } = await (supabase as any).from("earnings").insert({
        ...e,
        source_name: e.source_name.trim(),
        description: e.description?.trim() || null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["earnings"] });
      qc.invalidateQueries({ queryKey: ["earnings-all"] });
      toast.success("Ganho registrado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateEarning = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Earning> & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      if (updates.amount !== undefined && updates.amount <= 0) throw new Error("Valor deve ser maior que zero");
      if (updates.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(updates.date)) throw new Error("Formato de data inválido");
      }
      const { error } = await (supabase as any).from("earnings").update({
        ...updates,
        source_name: updates.source_name?.trim(),
        description: updates.description?.trim() || null,
      }).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["earnings"] });
      qc.invalidateQueries({ queryKey: ["earnings-all"] });
      toast.success("Ganho atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteEarning = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await (supabase as any).from("earnings").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["earnings"] });
      qc.invalidateQueries({ queryKey: ["earnings-all"] });
      toast.success("Ganho removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    data: query.data ?? [],
    allData: allEarnings.data ?? [],
    isLoading: query.isLoading,
    addEarning,
    updateEarning,
    deleteEarning,
  };
}
