import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Investment = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  institution: string | null;
  invested_amount: number;
  current_value: number;
  rate: string | null;
  start_date: string;
  maturity_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useInvestments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["investments", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("investments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Investment[];
    },
    enabled: !!user,
  });

  const addInvestment = useMutation({
    mutationFn: async (inv: Omit<Investment, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { error } = await (supabase as any).from("investments").insert({ ...inv, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Investimento adicionado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateInvestment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Investment> & { id: string }) => {
      const { error } = await (supabase as any).from("investments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Investimento atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteInvestment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("investments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      toast.success("Investimento removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, addInvestment, updateInvestment, deleteInvestment };
}
