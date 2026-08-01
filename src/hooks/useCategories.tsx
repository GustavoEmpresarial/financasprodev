import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: string; // "expense" | "income"
  parent_id: string | null;
  is_default: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#64748b",
];

export const CATEGORY_ICONS = [
  "utensils", "car", "home", "heart-pulse", "graduation-cap", "shopping-bag",
  "plane", "gamepad-2", "dumbbell", "wifi", "zap", "droplets", "phone",
  "repeat", "briefcase", "banknote", "trending-up", "gift", "pet", "baby",
  "shirt", "coffee", "bus", "fuel", "wrench", "package", "tag",
];

export function useCategories() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["categories", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("categories")
        .select("*")
        .is("deleted_at", null)
        .not("user_id", "is", null)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: !!user,
  });

  const all = query.data ?? [];
  const parents = all.filter((c) => !c.parent_id);
  const expenseCategories = parents.filter((c) => c.type === "expense");
  const incomeCategories = parents.filter((c) => c.type === "income");
  const subcategoriesOf = (parentId?: string | null) =>
    parentId ? all.filter((c) => c.parent_id === parentId) : [];

  const addCategory = useMutation({
    mutationFn: async (input: {
      name: string;
      type: string;
      color?: string | null;
      icon?: string | null;
      parent_id?: string | null;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const name = input.name.trim();
      if (!name) throw new Error("Nome é obrigatório");
      const duplicate = all.find(
        (c) =>
          c.name.toLowerCase() === name.toLowerCase() &&
          c.type === input.type &&
          (c.parent_id ?? null) === (input.parent_id ?? null)
      );
      if (duplicate) throw new Error("Já existe uma categoria com esse nome.");
      const { error } = await (supabase as any).from("categories").insert({
        name,
        type: input.type,
        color: input.color ?? "#64748b",
        icon: input.icon ?? "tag",
        parent_id: input.parent_id ?? null,
        is_default: false,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await (supabase as any)
        .from("categories")
        .update({ ...updates, name: updates.name?.trim() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria atualizada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const ids = [id, ...all.filter((c) => c.parent_id === id).map((c) => c.id)];
      const { error } = await (supabase as any)
        .from("categories")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Categoria excluída!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    ...query,
    data: all,
    parents,
    expenseCategories,
    incomeCategories,
    subcategoriesOf,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}
