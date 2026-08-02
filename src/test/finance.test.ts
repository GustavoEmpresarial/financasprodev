import { describe, it, expect } from "vitest";
import {
  activeOnly,
  monthTotal,
  netProfit,
  expensesByCategory,
  recurringExpenses,
  creditCardDebt,
  netWorth,
  forecastNet,
  savingsRate,
  type SimpleTx,
} from "@/lib/finance";
import { monthlyEquivalent, advanceDate } from "@/hooks/useSubscriptions";

const tx: SimpleTx[] = [
  { type: "income", amount: 5000, date: "2026-08-05" },
  { type: "expense", amount: 1200, date: "2026-08-06", category_id: "casa" },
  { type: "expense", amount: 300, date: "2026-08-10", category_id: "casa" },
  { type: "expense", amount: 110, date: "2026-08-15", is_recurring: true, category_id: "software" },
  { type: "expense", amount: 900, date: "2026-08-20", credit_card_id: "card-1" },
  { type: "expense", amount: 999, date: "2026-08-21", deleted_at: "2026-08-22T00:00:00Z" },
  { type: "income", amount: 4000, date: "2026-07-05" },
  { type: "expense", amount: 2000, date: "2026-07-08" },
];

describe("soft delete", () => {
  it("ignora registros excluídos", () => {
    expect(activeOnly(tx)).toHaveLength(7);
    expect(monthTotal(tx, "2026-08", "expense")).toBe(2510);
  });
});

describe("agregações do painel", () => {
  it("receita e despesa mensal", () => {
    expect(monthTotal(tx, "2026-08", "income")).toBe(5000);
    expect(monthTotal(tx, "2026-07", "expense")).toBe(2000);
  });

  it("lucro líquido", () => {
    expect(netProfit(tx, "2026-08")).toBe(2490);
    expect(netProfit(tx, "2026-07")).toBe(2000);
  });

  it("gastos por categoria", () => {
    expect(expensesByCategory(tx, "2026-08")).toEqual({
      casa: 1500,
      software: 110,
      "sem-categoria": 900,
    });
  });

  it("despesas recorrentes", () => {
    expect(recurringExpenses(tx, "2026-08")).toBe(110);
  });

  it("taxa de poupança", () => {
    expect(savingsRate(tx, "2026-08")).toBeCloseTo(0.498, 3);
    expect(savingsRate([], "2026-08")).toBe(0);
  });

  it("previsão dos próximos meses", () => {
    expect(forecastNet(tx, ["2026-07", "2026-08"], 2)).toBe(2245);
  });
});

describe("patrimônio líquido", () => {
  it("ativos - passivos", () => {
    const r = netWorth({
      accountsBalance: 10000,
      investments: 5000,
      altInvestments: 2000,
      crypto: 1000,
      liabilities: creditCardDebt(tx),
    });
    expect(r.totalAssets).toBe(18000);
    expect(r.totalLiabilities).toBe(900);
    expect(r.netWorth).toBe(17100);
  });

  it("recalcula ao remover um ativo", () => {
    const r = netWorth({ accountsBalance: 0, investments: 5000, altInvestments: 0, crypto: 0, liabilities: 900 });
    expect(r.netWorth).toBe(4100);
  });
});

describe("assinaturas geram despesas (regra de recorrência)", () => {
  it("equivalente mensal por frequência", () => {
    expect(monthlyEquivalent(110, "monthly")).toBe(110);
    expect(monthlyEquivalent(1200, "yearly")).toBe(100);
    expect(monthlyEquivalent(300, "quarterly")).toBe(100);
    expect(monthlyEquivalent(10, "weekly")).toBeCloseTo(43.45, 2);
  });

  it("avança a próxima cobrança", () => {
    expect(advanceDate("2026-08-10", "monthly")).toBe("2026-09-10");
    expect(advanceDate("2026-08-10", "weekly")).toBe("2026-08-17");
    expect(advanceDate("2026-08-10", "quarterly")).toBe("2026-11-10");
    expect(advanceDate("2026-08-10", "yearly")).toBe("2027-08-10");
  });

  it("assinatura não entra no total de despesas — apenas a despesa gerada", () => {
    // 3 meses de Claude Code a R$110 geram 3 despesas
    const generated: SimpleTx[] = ["2026-08-01", "2026-09-01", "2026-10-01"].map((d) => ({
      type: "expense",
      amount: 110,
      date: d,
      is_recurring: true,
    }));
    expect(monthTotal(generated, "2026-08", "expense")).toBe(110);
    expect(monthTotal(generated, "2026-09", "expense")).toBe(110);
    expect(generated.reduce((s, t) => s + t.amount, 0)).toBe(330);
  });
});
