"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { SlError } from "@/lib/service-layer";
import { createItem, updateItem } from "@/lib/sap/items";

export type ItemFormState = { error?: string; values?: Record<string, string> } | undefined;

const yesNo = z.string().optional().transform((v) => (v === "on" ? "tYES" : "tNO"));

const ItemSchema = z.object({
  ItemName: z.string().trim().min(1, "Informe a descrição").max(100, "Descrição com até 100 caracteres"),
  ItemsGroupCode: z.coerce.number().int().positive("Selecione o grupo"),
  SalesItem: yesNo,
  PurchaseItem: yesNo,
  InventoryItem: yesNo,
  BarCode: z.string().trim().max(254, "Código de barras muito longo").default(""),
  SalesUnit: z.string().trim().max(100, "Unidade muito longa").default(""),
});

const CreateSchema = ItemSchema.extend({
  ItemCode: z.string().trim().min(1, "Informe o código").max(50, "Código com até 50 caracteres"),
});

async function save(formData: FormData, run: (fd: Record<string, string>) => Promise<string>): Promise<ItemFormState> {
  await getUser();
  const values = Object.fromEntries([...formData].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  let code: string;
  try {
    code = await run(values);
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0].message, values };
    if (e instanceof SlError) return { error: e.message, values };
    throw e;
  }
  redirect(`/itens/${encodeURIComponent(code)}`);
}

export async function createItemAction(_: ItemFormState, formData: FormData) {
  return save(formData, async (values) => {
    const data = CreateSchema.parse(values);
    await createItem(data);
    return data.ItemCode;
  });
}

export async function updateItemAction(code: string, _: ItemFormState, formData: FormData) {
  return save(formData, async (values) => {
    // Argumento do .bind vem do client: validar também.
    const itemCode = z.string().min(1).parse(code);
    await updateItem(itemCode, ItemSchema.parse(values));
    return itemCode;
  });
}
