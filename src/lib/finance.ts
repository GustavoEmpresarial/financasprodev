/**
 * Funções puras de cálculo financeiro.
 * Centralizadas aqui para garantir que Painel, Analítico, Patrimônio e
 * Saúde Financeira usem exatamente a mesma matemática (e sejam testáveis).
 */

export type SimpleTx = {
  type: string; // "income" | "expense"
  amount: number;
  date: string; // YYYY-MM-DD
  category_id?: string | null;
  credit_card_id?: string | null;
  is_recurring?: boolean | null;
  deleted_at?: string | null;
};

/** Remove registros excluídos (soft delete) de qualquer coleção. */
export function activeOnly<T extends { deleted_at?: string | null }>(rows: T[]): T[] {
  return (rows ?? []).filter((r) => !r.deleted_at);
}

/** Soma de valores de um mês (YYYY-MM) por tipo. */
export function monthTotal(rows: SimpleTx[], month: string, type: "income" | "expense"): number {
  return activeOnly(rows)
    .filter((t) => t.type === type && (t.date ?? "").startsWith(month))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}

/** Lucro líquido do mês = receitas - despesas. */
export function netProfit(rows: SimpleTx[], month: string): number {
  return monthTotal(rows, month, "income") - monthTotal(rows, month, "expense");
}

/** Gastos agrupados por categoria em um mês. */
export function expensesByCategory(rows: SimpleTx[], month: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of activeOnly(rows)) {
    if (t.type !== "expense" || !(t.date ?? "").startsWith(month)) continue;
    const key = t.category_id ?? "sem-categoria";
    out[key] = (out[key] ?? 0) + Number(t.amount || 0);
  }
  return out;
}

/** Total de despesas marcadas como recorrentes no mês. */
export function recurringExpenses(rows: SimpleTx[], month: string): number {
  return activeOnly(rows)
    .filter((t) => t.type === "expense" && t.is_recurring && (t.date ?? "").startsWith(month))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}

/** Dívida total de cartão de crédito (despesas vinculadas a cartões). */
export function creditCardDebt(rows: SimpleTx[]): number {
  return activeOnly(rows)
    .filter((t) => t.type === "expense" && !!t.credit_card_id)
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}

export type NetWorthInput = {
  accountsBalance: number;
  investments: number;
  altInvestments: number;
  crypto: number;
  liabilities: number;
};

/** Patrimônio líquido = ativos - passivos. */
export function netWorth(i: NetWorthInput) {
  const totalAssets = i.accountsBalance + i.investments + i.altInvestments + i.crypto;
  return { totalAssets, totalLiabilities: i.liabilities, netWorth: totalAssets - i.liabilities };
}

/**
 * Previsão simples dos próximos meses com base na média dos últimos `window` meses.
 * Retorna a projeção de lucro líquido mensal.
 */
export function forecastNet(rows: SimpleTx[], months: string[], window = 3): number {
  const last = months.slice(-window);
  if (last.length === 0) return 0;
  const total = last.reduce((s, m) => s + netProfit(rows, m), 0);
  return total / last.length;
}

/** Taxa de poupança do mês (0..1). */
export function savingsRate(rows: SimpleTx[], month: string): number {
  const income = monthTotal(rows, month, "income");
  if (income <= 0) return 0;
  return (income - monthTotal(rows, month, "expense")) / income;
}
