import { useCallback } from "react";

// Aplicação 100% em Real Brasileiro (BRL).
// Mantido como hook para retrocompatibilidade com telas existentes.
export type CurrencyMode = "BRL";

export function useCurrency() {
  const format = useCallback((value: number): string => {
    return (value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }, []);

  const formatCompact = useCallback((value: number): string => {
    const v = value || 0;
    if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
    return `R$${v.toFixed(0)}`;
  }, []);

  const convert = useCallback((value: number) => value, []);
  const noop = useCallback(() => {}, []);

  return {
    mode: "BRL" as CurrencyMode,
    setMode: noop,
    rate: 1,
    setCustomRate: noop,
    convert,
    format,
    formatCompact,
    toggleMode: noop,
    symbol: "R$",
  };
}
