import "server-only";
import { containsAny, sl, slFind, slPage, key } from "@/lib/service-layer";

type YesNo = "tYES" | "tNO";

export type ItemRow = {
  ItemCode: string;
  ItemName: string;
  ItemsGroupCode: number;
  QuantityOnStock: number;
  Valid: YesNo;
  Frozen: YesNo;
};

export type ItemWarehouse = { WarehouseCode: string; InStock: number; Committed: number; Ordered: number };

export type ItemDetail = ItemRow & {
  SalesItem: YesNo;
  PurchaseItem: YesNo;
  InventoryItem: YesNo;
  BarCode: string | null;
  SalesUnit: string | null;
  ItemWarehouseInfoCollection: ItemWarehouse[];
};

/** Campos editáveis pelo portal (corpo de POST/PATCH). */
export type ItemInput = {
  ItemName: string;
  ItemsGroupCode: number;
  SalesItem: YesNo;
  PurchaseItem: YesNo;
  InventoryItem: YesNo;
  BarCode: string;
  SalesUnit: string;
};

export type ItemGroup = { Number: number; GroupName: string };

const path = (code: string) => `/Items(${key(code)})`;

export function listItems({ q, grupo, page }: { q?: string; grupo?: number; page: number }) {
  const filters: string[] = [];
  if (q) filters.push(containsAny(["ItemCode", "ItemName"], q));
  if (grupo !== undefined) filters.push(`ItemsGroupCode eq ${grupo}`);
  return slPage<ItemRow>("Items", {
    select: ["ItemCode", "ItemName", "ItemsGroupCode", "QuantityOnStock", "Valid", "Frozen"],
    filter: filters.join(" and ") || undefined,
    orderby: "ItemCode",
    page,
  });
}

/** `null` se não existir. */
export function getItem(code: string) {
  const select = [
    "ItemCode", "ItemName", "ItemsGroupCode", "QuantityOnStock", "Valid", "Frozen",
    "SalesItem", "PurchaseItem", "InventoryItem", "BarCode", "SalesUnit", "ItemWarehouseInfoCollection",
  ];
  return slFind<ItemDetail>(`${path(code)}?$select=${select.join(",")}`);
}

export function createItem(input: ItemInput & { ItemCode: string }) {
  return sl<ItemDetail>("/Items", { method: "POST", body: input });
}

export function updateItem(code: string, input: ItemInput) {
  return sl<void>(path(code), { method: "PATCH", body: input });
}

// ponytail: até 500 grupos numa chamada; paginar se algum cliente tiver mais.
export async function listItemGroups() {
  const res = await sl<{ value: ItemGroup[] }>("/ItemGroups?$select=Number,GroupName&$orderby=GroupName&$top=500", {
    headers: { Prefer: "odata.maxpagesize=500" },
  });
  return res.value;
}
