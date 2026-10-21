"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { SlError } from "@/lib/service-layer";
import { cancelPayment, createPayment } from "@/lib/sap/finance";

export type ActionState = { error?: string } | undefined;

const PaymentSchema = z.object({
  CardCode: z.string().trim().min(1, "Informe o cliente"),
  DocDate: z.iso.date("Data inválida"),
  method: z.enum(["transfer", "cash"], "Forma de pagamento inválida"),
  account: z.string().trim().min(1, "Informe a conta contábil"),
  invoices: z
    .array(z.object({ DocEntry: z.coerce.number().int().positive(), SumApplied: z.coerce.number().positive("Valor aplicado deve ser maior que zero") }))
    .min(1, "Selecione ao menos uma nota"),
});

export async function createPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await getUser();
  const parsed = PaymentSchema.safeParse({
    ...Object.fromEntries(formData),
    invoices: formData.getAll("invoice").map((d) => ({ DocEntry: d, SumApplied: formData.get(`sum_${d}`) })),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let docEntry: number;
  try {
    docEntry = (await createPayment(parsed.data)).DocEntry;
  } catch (e) {
    if (e instanceof SlError) return { error: e.message };
    throw e;
  }
  redirect(`/financeiro/recebimentos/${docEntry}`);
}

export async function cancelPaymentAction(docEntry: number): Promise<ActionState> {
  await getUser();
  const id = z.number().int().positive().safeParse(docEntry);
  if (!id.success) return { error: "Recebimento inválido" };
  try {
    await cancelPayment(id.data);
  } catch (e) {
    if (e instanceof SlError) return { error: e.message };
    throw e;
  }
  redirect(`/financeiro/recebimentos/${id.data}`);
}
