"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveDocument, lookup } from "./[tipo]/actions";
import { Alert, Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { formatMoney } from "@/lib/format";

type Option = { value: string; label: string };
export type FormLine = {
  ItemCode: string; ItemDescription?: string; Quantity: string; UnitPrice: string; WarehouseCode: string;
  BaseType?: number; BaseEntry?: number; BaseLine?: number;
};

const emptyLine = (): FormLine => ({ ItemCode: "", Quantity: "1", UnitPrice: "0", WarehouseCode: "" });

/** Opções do `<datalist>`: começa com a lista inicial do servidor e busca no SL ao digitar. */
function useLookup(kind: "customers" | "items", initial: Option[]) {
  const [options, setOptions] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const search = (q: string) => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) return;
    timer.current = setTimeout(() => lookup(kind, q).then(setOptions), 300);
  };
  return [options, search] as const;
}

export function DocumentForm({ tipo, cancelHref, today, customers, items, initial }: {
  tipo: string; cancelHref: string; today: string; customers: Option[]; items: Option[];
  initial: { CardCode: string; Comments: string; lines: FormLine[] };
}) {
  const [state, action] = useActionState(saveDocument, undefined);
  const [customerOptions, searchCustomers] = useLookup("customers", customers);
  const [itemOptions, searchItems] = useLookup("items", items);
  // Campos controlados: o form não é resetado quando a action devolve erro.
  const [header, setHeader] = useState({ CardCode: initial.CardCode, DocDate: today, DocDueDate: today, Comments: initial.Comments });
  const [lines, setLines] = useState<FormLine[]>(initial.lines.length ? initial.lines : [emptyLine()]);

  const setLine = (i: number, patch: Partial<FormLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.Quantity) || 0) * (Number(l.UnitPrice) || 0), 0);
  const payload = lines.map((l) => ({ ...l, ItemDescription: undefined, Quantity: Number(l.Quantity), UnitPrice: Number(l.UnitPrice) }));

  return (
    <form action={action} className="space-y-6">
      {state?.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="lines" value={JSON.stringify(payload)} />

      <div className="card grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field
            label="Cliente (código)" name="CardCode" list="customers-list" required autoComplete="off"
            value={header.CardCode} readOnly={lines.some((l) => l.BaseEntry != null)}
            onChange={(e) => { setHeader({ ...header, CardCode: e.target.value }); searchCustomers(e.target.value); }}
          />
          <datalist id="customers-list">
            {customerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </datalist>
        </div>
        <Field label="Data" name="DocDate" type="date" required value={header.DocDate} onChange={(e) => setHeader({ ...header, DocDate: e.target.value })} />
        <Field label="Vencimento" name="DocDueDate" type="date" required value={header.DocDueDate} onChange={(e) => setHeader({ ...header, DocDueDate: e.target.value })} />
        <div className="md:col-span-2">
          <label htmlFor="Comments" className="label">Observações</label>
          <textarea id="Comments" name="Comments" rows={2} maxLength={254} className="input" value={header.Comments} onChange={(e) => setHeader({ ...header, Comments: e.target.value })} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-theme border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Quantidade</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Depósito</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="min-w-56 px-4 py-2">
                  <input
                    aria-label={`Item da linha ${i + 1}`} list="items-list" required autoComplete="off" className="input"
                    value={l.ItemCode} readOnly={l.BaseEntry != null}
                    onChange={(e) => { setLine(i, { ItemCode: e.target.value }); searchItems(e.target.value); }}
                  />
                  {l.ItemDescription && <p className="mt-1 text-xs text-muted">{l.ItemDescription}</p>}
                </td>
                <td className="w-32 px-4 py-2">
                  <input aria-label={`Quantidade da linha ${i + 1}`} type="number" min="0" step="any" required className="input" value={l.Quantity} onChange={(e) => setLine(i, { Quantity: e.target.value })} />
                </td>
                <td className="w-36 px-4 py-2">
                  <input aria-label={`Preço da linha ${i + 1}`} type="number" min="0" step="any" required className="input" value={l.UnitPrice} onChange={(e) => setLine(i, { UnitPrice: e.target.value })} />
                </td>
                <td className="w-28 px-4 py-2">
                  <input aria-label={`Depósito da linha ${i + 1}`} maxLength={8} className="input" value={l.WarehouseCode} onChange={(e) => setLine(i, { WarehouseCode: e.target.value })} />
                </td>
                <td className="px-4 py-2 text-right">{formatMoney((Number(l.Quantity) || 0) * (Number(l.UnitPrice) || 0))}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" className="btn-secondary px-2 py-1.5" aria-label={`Remover linha ${i + 1}`} disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="items-list">
          {itemOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </datalist>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="button" className="btn-secondary" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
          <Plus size={16} /> Adicionar linha
        </button>
        <p className="text-sm">Total (sem impostos): <span className="text-lg font-semibold">{formatMoney(total)}</span></p>
      </div>

      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn-secondary">Cancelar</Link>
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}
