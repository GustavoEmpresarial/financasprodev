import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type RecurringSubscription = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: string;
  category_id: string | null;
  account_id: string | null;
  next_billing_date: string | null;
  is_active: boolean;
  notes: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export function useSubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["recurring_subscriptions", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("recurring_subscriptions")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as RecurringSubscription[];
    },
    enabled: !!user,
  });

  const addSubscription = useMutation({
    mutationFn: async (sub: Omit<RecurringSubscription, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { error } = await (supabase as any).from("recurring_subscriptions").insert({ ...sub, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_subscriptions"] });
      toast.success("Assinatura adicionada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringSubscription> & { id: string }) => {
      const { error } = await (supabase as any).from("recurring_subscriptions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_subscriptions"] });
      toast.success("Assinatura atualizada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("recurring_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_subscriptions"] });
      toast.success("Assinatura removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, addSubscription, updateSubscription, deleteSubscription };
}
