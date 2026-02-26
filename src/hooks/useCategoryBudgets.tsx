import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type CategoryBudget = {
  id: string;
  user_id: string;
  category_id: string | null;
  month: string;
  budget_amount: number;
  created_at: string;
  categories?: { name: string; icon: string | null; color: string | null } | null;
};

export function useCategoryBudgets(month?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["category_budgets", user?.id, month],
    queryFn: async () => {
      let q = (supabase as any)
        .from("category_budgets")
        .select("*, categories(name, icon, color)");
      if (month) q = q.eq("month", `${month}-01`);
      const { data, error } = await q;
      if (error) throw error;
      return data as CategoryBudget[];
    },
    enabled: !!user,
  });

  const setBudget = useMutation({
    mutationFn: async (budget: { category_id: string; month: string; budget_amount: number }) => {
      const { error } = await (supabase as any).from("category_budgets").insert({
        ...budget,
        month: `${budget.month}-01`,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category_budgets"] });
      toast.success("Orçamento definido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("category_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category_budgets"] });
      toast.success("Orçamento removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, setBudget, deleteBudget };
}
