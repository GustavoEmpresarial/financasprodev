import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Transaction = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  category_id: string | null;
  description: string | null;
  date: string;
  is_fixed: boolean;
  created_at: string;
  categories?: { name: string; icon: string | null; color: string | null } | null;
};

export function useTransactions(month?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const startOfMonth = month ? `${month}-01` : undefined;
  const endOfMonth = month
    ? new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).toISOString().split("T")[0]
    : undefined;

  const query = useQuery({
    queryKey: ["transactions", user?.id, month],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("*, categories(name, icon, color)")
        .order("date", { ascending: false });

      if (startOfMonth && endOfMonth) {
        q = q.gte("date", startOfMonth).lte("date", endOfMonth);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });

  const addTransaction = useMutation({
    mutationFn: async (tx: {
      type: string;
      amount: number;
      category_id: string;
      description?: string;
      date: string;
      is_fixed: boolean;
    }) => {
      const { error } = await supabase.from("transactions").insert({
        ...tx,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transação registrada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transação removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, addTransaction, deleteTransaction };
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}
