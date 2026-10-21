"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cancelPaymentAction } from "../actions";

export function CancelButton({ docEntry }: { docEntry: number }) {
  const [state, action] = useActionState(cancelPaymentAction.bind(null, docEntry), undefined);
  return (
    <form action={action} onSubmit={(e) => !confirm("Cancelar este recebimento?") && e.preventDefault()} className="flex flex-col items-end gap-2">
      <SubmitButton className="btn-danger">Cancelar recebimento</SubmitButton>
      {state?.error && <Alert>{state.error}</Alert>}
    </form>
  );
}
