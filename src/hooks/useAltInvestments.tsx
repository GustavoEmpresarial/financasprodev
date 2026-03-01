import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type AltInvestment = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  currency: string;
  invested_amount: number;
  expiration_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AltEarning = {
  id: string;
  investment_id: string;
  user_id: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
};

export function useAltInvestments() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const investments = useQuery({
    queryKey: ["alt-investments", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("alt_investments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AltInvestment[];
    },
    enabled: !!user,
  });

  const earnings = useQuery({
    queryKey: ["alt-earnings", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("alt_investment_earnings")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as AltEarning[];
    },
    enabled: !!user,
  });

  const addInvestment = useMutation({
    mutationFn: async (inv: Omit<AltInvestment, "id" | "user_id" | "created_at" | "updated_at" | "is_active">) => {
      const { error } = await (supabase as any).from("alt_investments").insert({ ...inv, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alt-investments"] });
      toast.success("Investimento adicionado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateInvestment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AltInvestment> & { id: string }) => {
      const { error } = await (supabase as any).from("alt_investments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alt-investments"] });
      toast.success("Investimento atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteInvestment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("alt_investments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alt-investments"] });
      qc.invalidateQueries({ queryKey: ["alt-earnings"] });
      toast.success("Investimento removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addEarning = useMutation({
    mutationFn: async (e: Omit<AltEarning, "id" | "user_id" | "created_at">) => {
      const { error } = await (supabase as any).from("alt_investment_earnings").insert({ ...e, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alt-earnings"] });
      toast.success("Ganho registrado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteEarning = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("alt_investment_earnings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alt-earnings"] });
      toast.success("Ganho removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadLogo = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("investment-logos").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("investment-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    investments: investments.data ?? [],
    earnings: earnings.data ?? [],
    isLoading: investments.isLoading || earnings.isLoading,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addEarning,
    deleteEarning,
    uploadLogo,
  };
}
