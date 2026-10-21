import "server-only";
import { containsAny, key, odataQuery, sl, slFind, slPage } from "@/lib/service-layer";

/** Os 5 documentos de marketing de vendas têm a mesma estrutura no SL; muda só a entidade. */
export const salesTypes = {
  cotacoes: { entity: "Quotations", objType: 23, label: "Cotações", singular: "Cotação", newLabel: "Nova cotação", route: "/vendas/cotacoes", next: ["pedidos"] },
  pedidos: { entity: "Orders", objType: 17, label: "Pedidos de venda", singular: "Pedido de venda", newLabel: "Novo pedido de venda", route: "/vendas/pedidos", next: ["entregas", "notas"] },
  entregas: { entity: "DeliveryNotes", objType: 15, label: "Entregas", singular: "Entrega", newLabel: "Nova entrega", route: "/vendas/entregas", next: ["notas", "devolucoes"] },
  notas: { entity: "Invoices", objType: 13, label: "Notas fiscais de saída", singular: "Nota fiscal de saída", newLabel: "Nova nota fiscal de saída", route: "/vendas/notas", next: [] },
  devolucoes: { entity: "Returns", objType: 16, label: "Devoluções", singular: "Devolução", newLabel: "Nova devolução", route: "/vendas/devolucoes", next: [] },
} as const satisfies Record<string, { entity: string; objType: number; label: string; singular: string; newLabel: string; route: string; next: readonly string[] }>;

export type SalesType = keyof typeof salesTypes;

export function salesType(tipo: string | undefined): SalesType | null {
  return tipo && Object.hasOwn(salesTypes, tipo) ? (tipo as SalesType) : null;
}

/** Pode gerar `to` a partir de `from` (copiar para)? */
export function canCopy(from: SalesType, to: SalesType) {
  return (salesTypes[from].next as readonly string[]).includes(to);
}

export type DocListRow = {
  DocEntry: number; DocNum: number; CardCode: string; CardName: string;
  DocDate: string; DocDueDate: string; DocTotal: number; DocumentStatus: string; Cancelled: string;
};

export type DocLine = {
  LineNum: number; ItemCode: string; ItemDescription: string; Quantity: number; RemainingOpenQuantity?: number;
  UnitPrice: number; WarehouseCode: string; LineTotal: number; LineStatus?: string;
  BaseType?: number; BaseEntry?: number | null; BaseLine?: number | null;
};

export type SalesDocument = DocListRow & { Comments: string | null; DocumentLines: DocLine[] };

const listSelect = ["DocEntry", "DocNum", "CardCode", "CardName", "DocDate", "DocDueDate", "DocTotal", "DocumentStatus", "Cancelled"];

export async function listDocuments(tipo: SalesType, { q = "", status, page = 1 }: { q?: string; status?: string; page?: number }) {
  const filters: string[] = [];
  if (status === "aberto") filters.push("DocumentStatus eq 'bost_Open'");
  if (status === "fechado") filters.push("DocumentStatus eq 'bost_Close'");
  if (/^\d+$/.test(q)) filters.push(`DocNum eq ${q}`);
  else if (q) filters.push(containsAny(["CardName", "CardCode"], q));
  return slPage<DocListRow>(salesTypes[tipo].entity, {
    select: listSelect,
    filter: filters.join(" and ") || undefined,
    orderby: "DocEntry desc",
    page,
  });
}

/** `null` se não existir. `DocumentLines` é coleção do documento: vem pelo `$select`, sem `$expand`. */
export async function getDocument(tipo: SalesType, docEntry: number) {
  const select = [...listSelect, "Comments", "DocumentLines"].join(",");
  return slFind<SalesDocument>(`/${salesTypes[tipo].entity}(${key(docEntry)})?$select=${select}`);
}

export type NewDocument = {
  CardCode: string; DocDate: string; DocDueDate: string; Comments?: string;
  DocumentLines: { ItemCode: string; Quantity: number; UnitPrice: number; WarehouseCode?: string; BaseType?: number; BaseEntry?: number; BaseLine?: number }[];
};

export async function createDocument(tipo: SalesType, payload: NewDocument) {
  const doc = await sl<{ DocEntry: number }>(`/${salesTypes[tipo].entity}`, { method: "POST", body: payload });
  return doc.DocEntry;
}

export async function closeDocument(tipo: SalesType, docEntry: number) {
  await sl(`/${salesTypes[tipo].entity}(${key(docEntry)})/Close`, { method: "POST" });
}

export async function cancelDocument(tipo: SalesType, docEntry: number) {
  await sl(`/${salesTypes[tipo].entity}(${key(docEntry)})/Cancel`, { method: "POST" });
}

// Lookups leves do formulário (não dependem dos módulos Itens/Parceiros).
export type Option = { value: string; label: string };

export async function searchCustomers(q = ""): Promise<Option[]> {
  const filter = ["CardType eq 'cCustomer'"];
  if (q) filter.push(containsAny(["CardCode", "CardName"], q));
  const params = odataQuery({ $select: "CardCode,CardName", $filter: filter.join(" and "), $orderby: "CardName", $top: 20 });
  const { value } = await sl<{ value: { CardCode: string; CardName: string }[] }>(`/BusinessPartners?${params}`);
  return value.map((c) => ({ value: c.CardCode, label: c.CardName }));
}

export async function searchItems(q = ""): Promise<Option[]> {
  const params = odataQuery({ $select: "ItemCode,ItemName", $orderby: "ItemCode", $top: 20, $filter: q ? containsAny(["ItemCode", "ItemName"], q) : undefined });
  const { value } = await sl<{ value: { ItemCode: string; ItemName: string }[] }>(`/Items?${params}`);
  return value.map((i) => ({ value: i.ItemCode, label: i.ItemName }));
}

/** Valida no servidor que o CardCode existe e é cliente. */
export async function isCustomer(cardCode: string) {
  const bp = await slFind<{ CardType: string }>(`/BusinessPartners(${key(cardCode)})?$select=CardCode,CardType`);
  return bp?.CardType === "cCustomer";
}
