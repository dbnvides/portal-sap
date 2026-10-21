"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/** Botão de submit que mostra spinner e bloqueia clique duplo enquanto a Server Action roda. */
export function SubmitButton({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? "Aguarde..." : children}
    </button>
  );
}
