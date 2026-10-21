const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export const formatMoney = (v: number | null | undefined) => money.format(v ?? 0);
export const formatNumber = (v: number | null | undefined) => number.format(v ?? 0);
/** Datas do SL vêm como `2026-10-20` ou `2026-10-20T00:00:00Z`. */
export const formatDate = (v: string | null | undefined) => (v ? date.format(new Date(v)) : "—");

/** `?page=2&q=abc` → `{ page: 2, q: "abc" }` */
export function listParams(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  return { page: Math.max(1, Number(one("page")) || 1), q: one("q")?.trim() ?? "", one };
}

/** Param de rota pode chegar codificado (`C%20001`); decodifica sem quebrar em `%` solto. */
export function decodeParam(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}
