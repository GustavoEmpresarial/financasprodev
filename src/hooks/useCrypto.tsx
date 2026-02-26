import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type CryptoHolding = {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useCrypto() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["crypto_holdings", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crypto_holdings")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CryptoHolding[];
    },
    enabled: !!user,
  });

  // Fetch live prices from CoinGecko (free, no key needed)
  const livePrices = useQuery({
    queryKey: ["crypto_prices", query.data?.map((c) => c.symbol).join(",")],
    queryFn: async () => {
      const symbols = query.data?.map((c) => c.symbol.toLowerCase()) || [];
      if (symbols.length === 0) return {};
      const ids = symbols.join(",");
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl`);
      if (!res.ok) return {};
      return (await res.json()) as Record<string, { brl: number }>;
    },
    enabled: !!query.data && query.data.length > 0,
    refetchInterval: 60000,
  });

  const addCrypto = useMutation({
    mutationFn: async (crypto: Omit<CryptoHolding, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { error } = await (supabase as any).from("crypto_holdings").insert({ ...crypto, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crypto_holdings"] });
      toast.success("Crypto adicionada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCrypto = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CryptoHolding> & { id: string }) => {
      const { error } = await (supabase as any).from("crypto_holdings").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crypto_holdings"] });
      toast.success("Crypto atualizada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCrypto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("crypto_holdings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crypto_holdings"] });
      toast.success("Crypto removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, livePrices, addCrypto, updateCrypto, deleteCrypto };
}
