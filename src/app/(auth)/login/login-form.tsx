"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { login } from "@/lib/auth-actions";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5">
      {state?.error && <Alert>{state.error}</Alert>}

      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <div className="relative">
          <Mail size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="email" name="email" type="email" autoComplete="username" required autoFocus
            placeholder="voce@empresa.com.br" defaultValue={state?.email} className="input py-2.5 pl-9"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="label">Senha</label>
        <div className="relative">
          <Lock size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
            placeholder="••••••••" className="input py-2.5 pl-9 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {next && <input type="hidden" name="next" value={next} />}
      <SubmitButton className="btn-primary w-full py-2.5">Entrar</SubmitButton>
    </form>
  );
}
