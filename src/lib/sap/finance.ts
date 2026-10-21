import "server-only";
import { containsAny, key, odataQuery, odataString, sl, slFind, slPage, SlError } from "@/lib/service-layer";
import { today } from "@/lib/today";

const OPEN_DOC = "DocumentStatus eq 'bost_Open' and Cancelled eq 'tNO'";
const cents = (v: number) => Math.round(v * 100);

// ---------- Contas a receber (Invoices em aberto) ----------

export type OpenInvoice = {
  DocEntry: number; DocNum: number; CardCode: string; CardName: string;
  DocDate: string; DocDueDate: string; DocTotal: number; PaidToDate: number; balance: number;
};

const INVOICE_SELECT = ["DocEntry", "DocNum", "CardCode", "CardName", "DocDate", "DocDueDate", "DocTotal", "PaidToDate"];
const withBalance = (r: Omit<OpenInvoice, "balance">): OpenInvoice => ({ ...r, balance: (cents(r.DocTotal) - cents(r.PaidToDate)) / 100 });

export async function getReceivables({ q, situacao, page }: { q: string; situacao?: string; page: number }) {
  const t = await today();
  const filters = [OPEN_DOC];
  if (q) filters.push(containsAny(["CardCode", "CardName"], q));
  if (situacao === "vencidas") filters.push(`DocDueDate lt ${odataString(t)}`);
  if (situacao === "a-vencer") filters.push(`DocDueDate ge ${odataString(t)}`);
  const res = await slPage<Omit<OpenInvoice, "balance">>("Invoices", { select: INVOICE_SELECT, filter: filters.join(" and "), orderby: "DocDueDate asc", page });
  return { ...res, rows: res.rows.map(withBalance), today: t };
}

/** Notas em aberto do cliente (para o novo recebimento). */
export async function getOpenInvoicesByCustomer(cardCode: string) {
  // ponytail: até 100 notas por cliente; paginar se algum cliente tiver mais.
  const res = await sl<{ value: Omit<OpenInvoice, "balance">[] }>(
    `/Invoices?${odataQuery({ $select: INVOICE_SELECT.join(","), $filter: `${OPEN_DOC} and CardCode eq ${odataString(cardCode)}`, $orderby: "DocDueDate asc", $top: 100 })}`,
    { headers: { Prefer: "odata.maxpagesize=100" } },
  );
  return res.value.map(withBalance);
}

// ---------- Recebimentos (IncomingPayments) ----------

type PaymentRaw = {
  DocEntry: number; DocNum: number; CardCode: string; CardName: string; DocDate: string;
  CashSum: number; TransferSum: number; Cancelled: string;
};
export type Payment = PaymentRaw & { total: number; method: string };

const PAYMENT_SELECT = ["DocEntry", "DocNum", "CardCode", "CardName", "DocDate", "CashSum", "TransferSum", "Cancelled"];
// ponytail: total = dinheiro + transferência; cheque/cartão (coleções) ficam de fora até o portal usá-los.
const toPayment = <T extends PaymentRaw>(p: T): T & Payment => ({
  ...p,
  total: (cents(p.CashSum ?? 0) + cents(p.TransferSum ?? 0)) / 100,
  method: [p.TransferSum > 0 && "Transferência", p.CashSum > 0 && "Dinheiro"].filter(Boolean).join(" + ") || "Outros",
});

export async function getPayments({ q, page }: { q: string; page: number }) {
  const filter = q ? containsAny(["CardCode", "CardName"], q) : undefined;
  const res = await slPage<PaymentRaw>("IncomingPayments", { select: PAYMENT_SELECT, filter, orderby: "DocEntry desc", page });
  return { ...res, rows: res.rows.map(toPayment) };
}

export type PaymentDetail = Payment & {
  TransferAccount: string | null; TransferDate: string | null; CashAccount: string | null; Remarks: string | null;
  PaymentInvoices: { DocEntry: number; SumApplied: number; InvoiceType: string }[];
};

/** `null` se não existir. */
export async function getPayment(docEntry: number) {
  const select = [...PAYMENT_SELECT, "TransferAccount", "TransferDate", "CashAccount", "Remarks", "PaymentInvoices"].join(",");
  const p = await slFind<PaymentDetail>(`/IncomingPayments(${key(docEntry)})?$select=${select}`);
  if (!p) return null;
  return { ...toPayment(p), PaymentInvoices: p.PaymentInvoices.map(({ DocEntry, SumApplied, InvoiceType }) => ({ DocEntry, SumApplied, InvoiceType })) };
}

export const cancelPayment = (docEntry: number) => sl<void>(`/IncomingPayments(${key(docEntry)})/Cancel`, { method: "POST" });

export type NewPayment = {
  CardCode: string; DocDate: string;
  method: "transfer" | "cash"; account: string;
  invoices: { DocEntry: number; SumApplied: number }[];
};

/**
 * Valida contra o SAP (nota do cliente, em aberto, saldo) e cria. Lança SlError com mensagem para o form.
 * Valor do pagamento = soma aplicada nas notas (calculado aqui, não vem do form).
 */
export async function createPayment(p: NewPayment) {
  const entries = p.invoices.map((i) => i.DocEntry);
  // Mesma nota duas vezes burlaria a checagem de saldo por nota.
  if (new Set(entries).size !== entries.length) throw new SlError("Nota repetida no recebimento.", 400);
  const amount = p.invoices.reduce((s, i) => s + cents(i.SumApplied), 0) / 100;

  // $top + maxpagesize = nº de notas: sem isso o SL devolve só a página padrão (20).
  const open = await sl<{ value: { DocEntry: number; DocTotal: number; PaidToDate: number }[] }>(
    `/Invoices?${odataQuery({
      $select: "DocEntry,DocTotal,PaidToDate",
      $filter: `${OPEN_DOC} and CardCode eq ${odataString(p.CardCode)} and (${entries.map((e) => `DocEntry eq ${e}`).join(" or ")})`,
      $top: entries.length,
    })}`,
    { headers: { Prefer: `odata.maxpagesize=${entries.length}` } },
  );
  for (const i of p.invoices) {
    const inv = open.value.find((o) => o.DocEntry === i.DocEntry);
    if (!inv) throw new SlError(`Nota ${i.DocEntry} não está em aberto ou não pertence ao cliente.`, 400);
    if (cents(i.SumApplied) > cents(inv.DocTotal) - cents(inv.PaidToDate)) throw new SlError(`Valor aplicado na nota ${i.DocEntry} excede o saldo.`, 400);
  }

  const body = {
    CardCode: p.CardCode,
    DocDate: p.DocDate,
    ...(p.method === "transfer"
      ? { TransferAccount: p.account, TransferSum: amount, TransferDate: p.DocDate }
      : { CashAccount: p.account, CashSum: amount }),
    PaymentInvoices: p.invoices.map((i) => ({ DocEntry: i.DocEntry, SumApplied: i.SumApplied, InvoiceType: "it_Invoice" })),
  };
  return sl<{ DocEntry: number }>("/IncomingPayments", { method: "POST", body });
}

// ---------- Dashboard ----------

const count = (entity: string, filter: string) => sl<number>(`/${entity}/$count?$filter=${encodeURIComponent(filter)}`).then(Number);

export const countOpenOrders = () => count("Orders", OPEN_DOC);
export const countActiveCustomers = () => count("BusinessPartners", "CardType eq 'cCustomer' and Valid eq 'tYES' and Frozen eq 'tNO'");
export const countOverdueInvoices = async () => count("Invoices", `${OPEN_DOC} and DocDueDate lt ${odataString(await today())}`);

/** Quantidade e saldo das notas em aberto via `$apply` (agregação no SL, sem trazer as linhas). */
export async function openReceivablesSummary() {
  const apply = `filter(${OPEN_DOC})/aggregate(DocTotal with sum as DocTotal,PaidToDate with sum as PaidToDate)`;
  const [n, agg] = await Promise.all([
    count("Invoices", OPEN_DOC),
    sl<{ value: { DocTotal: number | null; PaidToDate: number | null }[] }>(`/Invoices?$apply=${encodeURIComponent(apply)}`),
  ]);
  const a = agg.value[0];
  return { count: n, balance: (cents(a?.DocTotal ?? 0) - cents(a?.PaidToDate ?? 0)) / 100 };
}

export type RecentOrder = { DocEntry: number; DocNum: number; CardName: string; DocDate: string; DocTotal: number; DocumentStatus: string; Cancelled: string };

export async function getRecentOrders() {
  const res = await sl<{ value: RecentOrder[] }>(`/Orders?$select=DocEntry,DocNum,CardName,DocDate,DocTotal,DocumentStatus,Cancelled&$orderby=DocEntry desc&$top=5`);
  return res.value;
}

export async function getUpcomingDue() {
  const res = await sl<{ value: Omit<OpenInvoice, "balance">[] }>(
    `/Invoices?${odataQuery({ $select: INVOICE_SELECT.join(","), $filter: `${OPEN_DOC} and DocDueDate ge ${odataString(await today())}`, $orderby: "DocDueDate asc", $top: 5 })}`,
  );
  return res.value.map(withBalance);
}
