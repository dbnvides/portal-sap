"use client";

import { useActionState, useState } from "react";
import { Alert, Field, SelectField } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { formatDate, formatMoney } from "@/lib/format";
import { createPaymentAction } from "../actions";

type Inv = { DocEntry: number; DocNum: number; DocDueDate: string; balance: number };

export function PaymentForm({ cardCode, invoices, preselected, defaults }: {
  cardCode: string;
  invoices: Inv[];
  preselected?: number;
  defaults: { date: string; transfer: string; cash: string };
}) {
  const [state, action] = useActionState(createPaymentAction, undefined);
  // DocEntry → valor aplicado (string do input). Presente = nota marcada.
  const [applied, setApplied] = useState<Record<number, string>>(() => {
    const pre = invoices.find((i) => i.DocEntry === preselected);
    return pre ? { [pre.DocEntry]: pre.balance.toFixed(2) } : {};
  });
  const [method, setMethod] = useState("transfer");
  const total = Object.values(applied).reduce((s, v) => s + Math.round((Number(v) || 0) * 100), 0) / 100;

  function toggle(inv: Inv, on: boolean) {
    setApplied((a) => {
      const next = { ...a };
      if (on) next[inv.DocEntry] = inv.balance.toFixed(2);
      else delete next[inv.DocEntry];
      return next;
    });
  }

  if (invoices.length === 0) return <Alert>Nenhuma nota em aberto para o cliente {cardCode}.</Alert>;

  return (
    <form action={action} className="card space-y-6">
      {state?.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="CardCode" value={cardCode} />

      <div className="overflow-x-auto rounded-theme border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="px-4 py-3 font-medium">Receber</th>
              <th className="px-4 py-3 font-medium">Nota</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
              <th className="px-4 py-3 text-right font-medium">Valor aplicado</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const on = inv.DocEntry in applied;
              return (
                <tr key={inv.DocEntry} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <input type="checkbox" name="invoice" value={inv.DocEntry} checked={on} onChange={(e) => toggle(inv, e.target.checked)} aria-label={`Receber nota ${inv.DocNum}`} />
                  </td>
                  <td className="px-4 py-3">{inv.DocNum}</td>
                  <td className="px-4 py-3">{formatDate(inv.DocDueDate)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(inv.balance)}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number" name={`sum_${inv.DocEntry}`} step="0.01" min="0.01" max={inv.balance} disabled={!on}
                      value={applied[inv.DocEntry] ?? ""} onChange={(e) => setApplied((a) => ({ ...a, [inv.DocEntry]: e.target.value }))}
                      aria-label={`Valor aplicado na nota ${inv.DocNum}`} className="input ml-auto w-36 text-right"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Forma de pagamento" name="method" value={method} onChange={(e) => setMethod(e.target.value)}
          options={[{ value: "transfer", label: "Transferência" }, { value: "cash", label: "Dinheiro" }]}
        />
        <Field
          key={method} label={method === "transfer" ? "Conta de transferência" : "Conta caixa"} name="account" required
          defaultValue={method === "transfer" ? defaults.transfer : defaults.cash}
        />
        <Field label="Data" name="DocDate" type="date" required defaultValue={defaults.date} />
        {/* Valor = soma aplicada nas notas; o servidor recalcula, não confia neste número. */}
        <div>
          <span className="label">Valor do pagamento</span>
          <p id="amount" className="input bg-background font-semibold">{formatMoney(total)}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <SubmitButton>Registrar recebimento</SubmitButton>
      </div>
    </form>
  );
}
