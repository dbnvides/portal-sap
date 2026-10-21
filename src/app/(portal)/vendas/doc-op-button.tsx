"use client";

import { useActionState } from "react";
import { documentOp } from "./[tipo]/actions";
import { SubmitButton } from "@/components/submit-button";

/** Fechar/Cancelar documento com confirmação. Erro do SL aparece abaixo do botão. */
export function DocOpButton({ tipo, docEntry, op, label, confirmText }: {
  tipo: string; docEntry: number; op: "close" | "cancel"; label: string; confirmText: string;
}) {
  const [state, action] = useActionState(documentOp, undefined);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(confirmText)) e.preventDefault(); }}>
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="docEntry" value={docEntry} />
      <input type="hidden" name="op" value={op} />
      <SubmitButton className={op === "cancel" ? "btn-danger" : "btn-secondary"}>{label}</SubmitButton>
      {state?.error && <p role="alert" className="mt-1 max-w-xs text-xs text-danger">{state.error}</p>}
    </form>
  );
}
