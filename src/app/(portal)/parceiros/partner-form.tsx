"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Field, SelectField } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { PartnerState } from "./actions";

const TYPES = [
  { value: "cCustomer", label: "Cliente" },
  { value: "cSupplier", label: "Fornecedor" },
  { value: "cLid", label: "Lead" },
];

export function PartnerForm({ action, initial = {}, groups, cancelHref }: {
  action: (state: PartnerState, formData: FormData) => Promise<PartnerState>;
  initial?: Record<string, string>;
  groups: { Code: number; Name: string }[];
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const v = state?.values ?? initial;
  const isNew = !initial.CardCode;
  return (
    <form action={formAction} className="card space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        {isNew && <Field label="Código" name="CardCode" required maxLength={15} defaultValue={v.CardCode} />}
        <Field label="Nome" name="CardName" required maxLength={100} defaultValue={v.CardName} />
        <SelectField label="Tipo" name="CardType" options={TYPES} defaultValue={v.CardType ?? "cCustomer"} />
        <SelectField
          label="Grupo"
          name="GroupCode"
          options={[{ value: "", label: "Padrão do SAP" }, ...groups.map((g) => ({ value: String(g.Code), label: g.Name }))]}
          defaultValue={v.GroupCode ?? ""}
        />
        <Field label="CNPJ/CPF" name="FederalTaxID" maxLength={32} defaultValue={v.FederalTaxID} />
        <Field label="Telefone" name="Phone1" maxLength={20} defaultValue={v.Phone1} />
        <Field label="E-mail" name="EmailAddress" type="email" maxLength={100} defaultValue={v.EmailAddress} />
      </div>
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn-secondary">Cancelar</Link>
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}
