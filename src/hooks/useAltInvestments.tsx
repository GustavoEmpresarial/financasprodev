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
      if (!user) throw new Error("Usuário não autenticado");
      // Validate inputs
      if (!inv.name || inv.name.trim().length === 0) throw new Error("Nome é obrigatório");
      if (inv.name.trim().length > 200) throw new Error("Nome deve ter no máximo 200 caracteres");
      if (inv.invested_amount < 0) throw new Error("Valor investido não pode ser negativo");
      if (inv.description && inv.description.length > 1000) throw new Error("Descrição deve ter no máximo 1000 caracteres");

      const { error } = await (supabase as any).from("alt_investments").insert({
        ...inv,
        name: inv.name.trim(),
        description: inv.description?.trim() || null,
        user_id: user.id,
      });
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
      if (!user) throw new Error("Usuário não autenticado");
      if (updates.name !== undefined && updates.name.trim().length === 0) throw new Error("Nome é obrigatório");
      if (updates.invested_amount !== undefined && updates.invested_amount < 0) throw new Error("Valor não pode ser negativo");

      const { error } = await (supabase as any).from("alt_investments").update({
        ...updates,
        name: updates.name?.trim(),
        description: updates.description?.trim() || null,
      }).eq("id", id).eq("user_id", user.id);
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
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await (supabase as any).from("alt_investments").delete().eq("id", id).eq("user_id", user.id);
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
      if (!user) throw new Error("Usuário não autenticado");
      if (e.amount <= 0) throw new Error("Valor deve ser maior que zero");
      if (!e.date) throw new Error("Data é obrigatória");
      if (e.notes && e.notes.length > 500) throw new Error("Observação deve ter no máximo 500 caracteres");

      // Validate date format (YYYY-MM-DD) and ensure it's sent exactly as-is
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(e.date)) throw new Error("Formato de data inválido");

      // Check for duplicate: same investment, same date, same amount
      const { data: existing } = await (supabase as any)
        .from("alt_investment_earnings")
        .select("id")
        .eq("investment_id", e.investment_id)
        .eq("date", e.date)
        .eq("amount", e.amount)
        .eq("user_id", user.id);

      if (existing && existing.length > 0) {
        throw new Error("Já existe um ganho com mesmo valor e data para este investimento. Adicione uma observação diferente para distinguir.");
      }

      const { error } = await (supabase as any).from("alt_investment_earnings").insert({
        investment_id: e.investment_id,
        amount: e.amount,
        date: e.date, // Send the exact date string without any transformation
        notes: e.notes?.trim() || null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alt-earnings"] });
      toast.success("Ganho registrado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateEarning = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AltEarning> & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      if (updates.amount !== undefined && updates.amount <= 0) throw new Error("Valor deve ser maior que zero");
      if (updates.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(updates.date)) throw new Error("Formato de data inválido");
      }

      const { error } = await (supabase as any).from("alt_investment_earnings").update({
        ...updates,
        notes: updates.notes?.trim() || null,
      }).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alt-earnings"] });
      toast.success("Ganho atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteEarning = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await (supabase as any).from("alt_investment_earnings").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alt-earnings"] });
      toast.success("Ganho removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadLogo = async (file: File): Promise<string> => {
    if (!user) throw new Error("Usuário não autenticado");
    if (file.size > 2 * 1024 * 1024) throw new Error("Imagem deve ter no máximo 2MB");
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) throw new Error("Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF.");

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
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
    updateEarning,
    deleteEarning,
    uploadLogo,
  };
}
