import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useGoals(month?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["goals", user?.id, month],
    queryFn: async () => {
      let q = supabase.from("financial_goals").select("*").order("created_at", { ascending: false });
      if (month) q = q.eq("month", `${month}-01`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addGoal = useMutation({
    mutationFn: async (goal: { title: string; target_amount: number; month: string }) => {
      const { error } = await supabase.from("financial_goals").insert({
        ...goal,
        month: `${goal.month}-01`,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta criada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, current_amount }: { id: string; current_amount: number }) => {
      const { error } = await supabase.from("financial_goals").update({ current_amount }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta atualizada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, addGoal, updateGoal, deleteGoal };
}
