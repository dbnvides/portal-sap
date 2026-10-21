"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Field, SelectField } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { UserState } from "./actions";

const ROLES = [
  { value: "user", label: "Usuário" },
  { value: "admin", label: "Administrador" },
];

/** Sem `initial` = criação (e-mail + senha obrigatória); com `initial` = edição (ativo + senha opcional). */
export function UserForm({ action, initial }: {
  action: (state: UserState, formData: FormData) => Promise<UserState>;
  initial?: { name: string; email: string; role: string; active: boolean };
}) {
  const [state, formAction] = useActionState(action, undefined);
  const v = state?.values;
  const isNew = !initial;
  return (
    <form action={formAction} className="card space-y-4">
      {state?.error && <Alert>{state.error}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome" name="name" required maxLength={100} defaultValue={v?.name ?? initial?.name} />
        {isNew
          ? <Field label="E-mail" name="email" type="email" required autoComplete="off" defaultValue={v?.email} />
          : <Field label="E-mail" name="email-readonly" type="email" disabled defaultValue={initial.email} />}
        <SelectField label="Perfil" name="role" options={ROLES} defaultValue={v?.role ?? initial?.role ?? "user"} />
        <Field
          label={isNew ? "Senha" : "Nova senha (opcional)"}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required={isNew}
        />
        {!isNew && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={v ? v.active === "on" : initial.active} className="size-4 accent-primary" />
            Ativo
          </label>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Link href="/admin/usuarios" className="btn-secondary">Cancelar</Link>
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}
