import "server-only";
import { containsAny, key, odataString, sl, slFind, slPage } from "@/lib/service-layer";

export type CardType = "cCustomer" | "cSupplier" | "cLid";

export const CARD_TYPES: Record<CardType, string> = { cCustomer: "Cliente", cSupplier: "Fornecedor", cLid: "Lead" };

export type PartnerRow = {
  CardCode: string;
  CardName: string;
  CardType: CardType;
  FederalTaxID: string | null;
  Phone1: string | null;
  EmailAddress: string | null;
  CurrentAccountBalance: number;
};

export type PartnerAddress = {
  AddressName: string;
  AddressType: "bo_BillTo" | "bo_ShipTo";
  Street: string | null;
  StreetNo: string | null;
  Block: string | null;
  City: string | null;
  State: string | null;
  ZipCode: string | null;
  Country: string | null;
};

export type PartnerContact = {
  InternalCode: number;
  Name: string;
  Position: string | null;
  Phone1: string | null;
  MobilePhone: string | null;
  E_Mail: string | null;
};

export type Partner = PartnerRow & {
  GroupCode: number | null;
  BPAddresses: PartnerAddress[];
  ContactEmployees: PartnerContact[];
};

export type PartnerInput = {
  CardName: string;
  CardType: CardType;
  FederalTaxID: string;
  Phone1: string;
  EmailAddress: string;
  GroupCode?: number;
};

const ROW_FIELDS = ["CardCode", "CardName", "CardType", "FederalTaxID", "Phone1", "EmailAddress", "CurrentAccountBalance"];

export function listPartners({ q, tipo, page }: { q?: string; tipo?: string; page?: number }) {
  const filters: string[] = [];
  if (q) filters.push(containsAny(["CardCode", "CardName"], q));
  if (tipo && Object.hasOwn(CARD_TYPES, tipo)) filters.push(`CardType eq ${odataString(tipo)}`);
  return slPage<PartnerRow>("BusinessPartners", {
    select: ROW_FIELDS,
    filter: filters.join(" and ") || undefined,
    orderby: "CardName",
    page,
  });
}

/** `null` se não existir. */
export async function getPartner(code: string) {
  const select = [...ROW_FIELDS, "GroupCode", "BPAddresses", "ContactEmployees"].join(",");
  return slFind<Partner>(`/BusinessPartners(${key(code)})?$select=${select}`);
}

export async function listPartnerGroups() {
  const res = await sl<{ value: { Code: number; Name: string }[] }>("/BusinessPartnerGroups?$select=Code,Name&$orderby=Name", {
    headers: { Prefer: "odata.maxpagesize=500" },
  });
  return res.value;
}

export function createPartner(code: string, input: PartnerInput) {
  return sl<Partner>("/BusinessPartners", { method: "POST", body: { CardCode: code, ...input } });
}

export function updatePartner(code: string, input: PartnerInput) {
  return sl<void>(`/BusinessPartners(${key(code)})`, { method: "PATCH", body: input });
}
