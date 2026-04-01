import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type FinancialAccount = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  balance: number;
  currency: string;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["financial_accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("financial_accounts")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as FinancialAccount[];
    },
    enabled: !!user,
  });

  const addAccount = useMutation({
    mutationFn: async (account: { name: string; account_type: string; balance?: number; color?: string; icon?: string }) => {
      const { error } = await (supabase as any).from("financial_accounts").insert({ ...account, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
      toast.success("Conta criada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinancialAccount> & { id: string }) => {
      const { error } = await (supabase as any).from("financial_accounts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
      toast.success("Conta atualizada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("financial_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
      toast.success("Conta removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, addAccount, updateAccount, deleteAccount };
}
