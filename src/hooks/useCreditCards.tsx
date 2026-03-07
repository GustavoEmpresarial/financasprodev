import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type CreditCard = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  total_limit: number;
  closing_day: number;
  due_day: number;
  color: string | null;
  card_type: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export function useCreditCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["credit_cards", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("credit_cards")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!user,
  });

  const addCard = useMutation({
    mutationFn: async (card: Omit<CreditCard, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { error } = await (supabase as any).from("credit_cards").insert({ ...card, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      toast.success("Cartão adicionado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditCard> & { id: string }) => {
      const { error } = await (supabase as any).from("credit_cards").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      toast.success("Cartão atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("credit_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      toast.success("Cartão removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadCardImage = async (cardId: string, file: File) => {
    if (!user) throw new Error("Não autenticado");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${cardId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("card-images").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("card-images").getPublicUrl(path);
    await updateCard.mutateAsync({ id: cardId, image_url: urlData.publicUrl });
    return urlData.publicUrl;
  };

  return { ...query, addCard, updateCard, deleteCard, uploadCardImage };
}
