"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { SlError } from "@/lib/service-layer";
import {
  salesType, salesTypes, createDocument, closeDocument, cancelDocument, isCustomer, searchCustomers, searchItems,
} from "@/lib/sap/sales-documents";

export type FormState = { error?: string } | undefined;

const tipoSchema = z.string().refine((t) => salesType(t) !== null, "Tipo de documento inválido");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const int = z.number().int().nonnegative();

const LineSchema = z.object({
  ItemCode: z.string().trim().min(1, "Informe o item em todas as linhas").max(50),
  Quantity: z.number().positive("Quantidade deve ser maior que zero"),
  UnitPrice: z.number().nonnegative("Preço inválido"),
  WarehouseCode: z.string().trim().max(8).optional().transform((v) => v || undefined),
  BaseType: int.optional(),
  BaseEntry: int.optional(),
  BaseLine: int.optional(),
});

const DocSchema = z.object({
  tipo: tipoSchema,
  CardCode: z.string().trim().min(1, "Informe o cliente").max(50),
  DocDate: date,
  DocDueDate: date,
  Comments: z.string().trim().max(254).optional(),
  lines: z.string().transform((s, ctx) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Linhas inválidas" });
      return z.NEVER;
    }
  }).pipe(z.array(LineSchema).min(1, "Adicione ao menos uma linha")),
});

export async function saveDocument(_: FormState, formData: FormData): Promise<FormState> {
  await getUser();
  const parsed = DocSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { tipo, lines, ...header } = parsed.data;
  const t = salesType(tipo)!;

  let docEntry: number;
  try {
    if (!(await isCustomer(header.CardCode))) return { error: `Cliente ${header.CardCode} não encontrado` };
    docEntry = await createDocument(t, { ...header, Comments: header.Comments || undefined, DocumentLines: lines });
  } catch (e) {
    if (e instanceof SlError) return { error: e.message };
    throw e;
  }
  redirect(`${salesTypes[t].route}/${docEntry}`);
}

const OpSchema = z.object({ tipo: tipoSchema, docEntry: z.coerce.number().int().positive(), op: z.enum(["close", "cancel"]) });

export async function documentOp(_: FormState, formData: FormData): Promise<FormState> {
  await getUser();
  const parsed = OpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const t = salesType(parsed.data.tipo)!;
  try {
    await (parsed.data.op === "close" ? closeDocument : cancelDocument)(t, parsed.data.docEntry);
  } catch (e) {
    if (e instanceof SlError) return { error: e.message };
    throw e;
  }
  revalidatePath(`${salesTypes[t].route}/${parsed.data.docEntry}`);
}

const LookupSchema = z.object({ kind: z.enum(["customers", "items"]), q: z.string().trim().max(50) });

/** Busca do `<datalist>` do formulário. */
export async function lookup(kind: "customers" | "items", q: string) {
  await getUser();
  const p = LookupSchema.safeParse({ kind, q });
  if (!p.success) return [];
  return p.data.kind === "customers" ? searchCustomers(p.data.q) : searchItems(p.data.q);
}
