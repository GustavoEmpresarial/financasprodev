import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type AccountTransfer = {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
  from_account?: { name: string; color: string | null };
  to_account?: { name: string; color: string | null };
};

export function useTransfers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["account_transfers", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("account_transfers")
        .select("*, from_account:financial_accounts!account_transfers_from_account_id_fkey(name, color), to_account:financial_accounts!account_transfers_to_account_id_fkey(name, color)")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as AccountTransfer[];
    },
    enabled: !!user,
  });

  const addTransfer = useMutation({
    mutationFn: async (transfer: { from_account_id: string; to_account_id: string; amount: number; description?: string; date: string }) => {
      // Insert transfer
      const { error } = await (supabase as any).from("account_transfers").insert({ ...transfer, user_id: user!.id });
      if (error) throw error;
      // Update balances
      const { data: fromAcc } = await (supabase as any).from("financial_accounts").select("balance").eq("id", transfer.from_account_id).single();
      const { data: toAcc } = await (supabase as any).from("financial_accounts").select("balance").eq("id", transfer.to_account_id).single();
      if (fromAcc) await (supabase as any).from("financial_accounts").update({ balance: fromAcc.balance - transfer.amount }).eq("id", transfer.from_account_id);
      if (toAcc) await (supabase as any).from("financial_accounts").update({ balance: toAcc.balance + transfer.amount }).eq("id", transfer.to_account_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account_transfers"] });
      queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
      toast.success("Transferência realizada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTransfer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("account_transfers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account_transfers"] });
      queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
      toast.success("Transferência removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, addTransfer, deleteTransfer };
}
