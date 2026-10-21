"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { SlError } from "@/lib/service-layer";
import { createPartner, updatePartner, type PartnerInput } from "@/lib/sap/business-partners";

export type PartnerState = { error?: string; values?: Record<string, string> } | undefined;

const opt = (max: number) => z.string().trim().max(max, `Máximo de ${max} caracteres`);

const Schema = z.object({
  CardName: z.string().trim().min(1, "Informe o nome").max(100, "Nome: máximo de 100 caracteres"),
  CardType: z.enum(["cCustomer", "cSupplier", "cLid"], "Tipo inválido"),
  FederalTaxID: opt(32),
  Phone1: opt(20),
  EmailAddress: z.union([z.literal(""), z.email("E-mail inválido").max(100)]),
  GroupCode: z.union([z.literal("").transform(() => undefined), z.coerce.number().int()]),
});

const CodeSchema = z.string().trim().min(1, "Informe o código").max(15, "Código: máximo de 15 caracteres");

function parse(formData: FormData) {
  const values = Object.fromEntries([...formData].map(([k, v]) => [k, String(v)]));
  const parsed = Schema.safeParse({ EmailAddress: "", FederalTaxID: "", Phone1: "", GroupCode: "", ...values });
  if (!parsed.success) return { values, error: parsed.error.issues[0].message };
  const { GroupCode, ...rest } = parsed.data;
  const input: PartnerInput = GroupCode === undefined ? rest : { ...rest, GroupCode };
  return { values, input };
}

function slMessage(e: unknown) {
  if (e instanceof SlError) return `SAP: ${e.message}`;
  throw e;
}

export async function createPartnerAction(_: PartnerState, formData: FormData): Promise<PartnerState> {
  await getUser();
  const { values, input, error } = parse(formData);
  const code = CodeSchema.safeParse(values.CardCode);
  if (!code.success) return { values, error: code.error.issues[0].message };
  if (!input) return { values, error };
  try {
    await createPartner(code.data, input);
  } catch (e) {
    return { values, error: slMessage(e) };
  }
  redirect(`/parceiros/${encodeURIComponent(code.data)}`);
}

export async function updatePartnerAction(code: string, _: PartnerState, formData: FormData): Promise<PartnerState> {
  await getUser();
  const { values, input, error } = parse(formData);
  // Argumento do .bind vem do client: validar também.
  const cardCode = CodeSchema.safeParse(code);
  if (!cardCode.success) return { values, error: cardCode.error.issues[0].message };
  if (!input) return { values, error };
  try {
    await updatePartner(cardCode.data, input);
  } catch (e) {
    return { values, error: slMessage(e) };
  }
  redirect(`/parceiros/${encodeURIComponent(cardCode.data)}`);
}
