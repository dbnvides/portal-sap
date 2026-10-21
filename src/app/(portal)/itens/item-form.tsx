"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Field, SelectField } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { ItemFormState } from "./actions";

type Action = (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;

export function ItemForm({ action, initial, groups, cancelHref, isNew }: {
  action: Action;
  initial: Record<string, string>;
  groups: { value: string; label: string }[];
  cancelHref: string;
  isNew: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const v = state?.values ?? initial;
  const flag = (name: string, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={v[name] === "on"} /> {label}
    </label>
  );
  return (
    <form action={formAction} className="card space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        {isNew && <Field label="Código" name="ItemCode" required maxLength={50} defaultValue={v.ItemCode} />}
        <Field label="Descrição" name="ItemName" required maxLength={100} defaultValue={v.ItemName} />
        <SelectField label="Grupo" name="ItemsGroupCode" required options={groups} defaultValue={v.ItemsGroupCode} />
        <Field label="Código de barras" name="BarCode" maxLength={254} defaultValue={v.BarCode} />
        <Field label="Unidade de venda" name="SalesUnit" maxLength={100} defaultValue={v.SalesUnit} />
      </div>
      <fieldset className="flex flex-wrap gap-6">
        <legend className="label">Tipo</legend>
        {flag("SalesItem", "Item de venda")}
        {flag("PurchaseItem", "Item de compra")}
        {flag("InventoryItem", "Item de estoque")}
      </fieldset>
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn-secondary">Cancelar</Link>
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}
