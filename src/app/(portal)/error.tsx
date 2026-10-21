"use client";

import { Alert } from "@/components/ui";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <Alert>
        <p className="font-medium">Não foi possível carregar esta página.</p>
        <p className="mt-1">{error.message}</p>
      </Alert>
      <button className="btn-secondary" onClick={reset}>Tentar novamente</button>
    </div>
  );
}
