import { useState, useCallback, useMemo } from "react";

const DEFAULT_BRL_TO_USD = 0.18; // ~5.5 BRL per USD fallback

export type CurrencyMode = "USD" | "BRL";

export function useCurrency() {
  const [mode, setMode] = useState<CurrencyMode>("USD");
  const [customRate, setCustomRate] = useState<number | null>(null);

  const rate = useMemo(() => customRate ?? DEFAULT_BRL_TO_USD, [customRate]);

  const convert = useCallback(
    (value: number, fromCurrency: string = "BRL"): number => {
      if (mode === "BRL") return value;
      // Already USD
      if (fromCurrency === "USD") return value;
      // BRL → USD
      if (fromCurrency === "BRL") return value * rate;
      // Crypto or other – pass through (already display-level)
      return value;
    },
    [mode, rate]
  );

  const format = useCallback(
    (value: number, fromCurrency: string = "BRL"): string => {
      const converted = convert(value, fromCurrency);
      if (mode === "USD") {
        return converted.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return converted.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    },
    [convert, mode]
  );

  const formatCompact = useCallback(
    (value: number, fromCurrency: string = "BRL"): string => {
      const converted = convert(value, fromCurrency);
      const symbol = mode === "USD" ? "$" : "R$";
      if (Math.abs(converted) >= 1_000_000) {
        return `${symbol}${(converted / 1_000_000).toFixed(1)}M`;
      }
      if (Math.abs(converted) >= 1_000) {
        return `${symbol}${(converted / 1_000).toFixed(0)}k`;
      }
      return `${symbol}${converted.toFixed(0)}`;
    },
    [convert, mode]
  );

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "USD" ? "BRL" : "USD"));
  }, []);

  return {
    mode,
    setMode,
    rate,
    setCustomRate,
    convert,
    format,
    formatCompact,
    toggleMode,
    symbol: mode === "USD" ? "$" : "R$",
  };
}
