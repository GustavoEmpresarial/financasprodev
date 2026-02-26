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
  is_recurring: boolean;
  recurrence_interval: string | null;
  category_id: string | null;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  categories?: { name: string; icon: string | null; color: string | null } | null;
};

export function useBills(month?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bills", user?.id, month],
    queryFn: async () => {
      let q = (supabase as any)
        .from("bills")
        .select("*, categories(name, icon, color)")
        .order("due_date", { ascending: true });

      if (month) {
        const start = `${month}-01`;
        const end = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0).toISOString().split("T")[0];
        q = q.gte("due_date", start).lte("due_date", end);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Bill[];
    },
    enabled: !!user,
  });

  const addBill = useMutation({
    mutationFn: async (bill: Omit<Bill, "id" | "user_id" | "created_at" | "updated_at" | "categories" | "paid_at">) => {
      const { error } = await (supabase as any).from("bills").insert({ ...bill, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Conta adicionada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await (supabase as any)
        .from("bills")
        .update({ is_paid, paid_at: is_paid ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Status atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("bills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Conta removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, addBill, togglePaid, deleteBill };
}
