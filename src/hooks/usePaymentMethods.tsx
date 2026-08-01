import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type PaymentMethod = {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export function usePaymentMethods() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["payment_methods", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_methods")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
    enabled: !!user,
  });

  const addPaymentMethod = useMutation({
    mutationFn: async (input: { name: string; slug?: string | null; icon?: string | null }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const name = input.name.trim();
      if (!name) throw new Error("Nome é obrigatório");
      const { error } = await (supabase as any).from("payment_methods").insert({
        name,
        slug: input.slug ?? name.toLowerCase().replace(/\s+/g, "_"),
        icon: input.icon ?? "wallet",
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_methods"] });
      toast.success("Método de pagamento criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePaymentMethod = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentMethod> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("payment_methods")
        .update({ ...updates, name: updates.name?.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_methods"] });
      toast.success("Método atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("payment_methods")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_methods"] });
      toast.success("Método excluído!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, data: query.data ?? [], addPaymentMethod, updatePaymentMethod, deletePaymentMethod };
}
