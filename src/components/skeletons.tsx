/**
 * Telas de carregamento usadas pelos `loading.tsx` das rotas.
 * Mesmo formato da tela real, para a página não "pular" quando os dados chegam.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-border ${className}`} />;
}

function HeaderSkeleton() {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="space-y-2">
        <Bar className="h-7 w-56" />
        <Bar className="h-4 w-80 max-w-full" />
      </div>
      <Bar className="h-9 w-28" />
    </div>
  );
}

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Carregando...</span>
      {children}
    </div>
  );
}

/** Lista: título, busca, tabela e paginação. */
export function ListSkeleton() {
  return (
    <Loading>
      <HeaderSkeleton />
      <div className="mb-4 flex gap-2">
        <Bar className="h-9 flex-1" />
        <Bar className="h-9 w-24" />
      </div>
      <div className="overflow-hidden rounded-theme border border-border bg-surface">
        <div className="border-b border-border px-4 py-3"><Bar className="h-3 w-1/2" /></div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b border-border px-4 py-3.5 last:border-0">
            <Bar className="h-4 w-24" />
            <Bar className="h-4 flex-1" />
            <Bar className="h-4 w-20" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

/** Detalhe: título, card de campos e uma tabela. */
export function DetailSkeleton() {
  return (
    <Loading>
      <HeaderSkeleton />
      <div className="card mb-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Bar className="h-3 w-20" />
            <Bar className="h-4 w-32" />
          </div>
        ))}
      </div>
      <Bar className="h-48 w-full rounded-theme" />
    </Loading>
  );
}

/** Formulário: título e card com campos. */
export function FormSkeleton() {
  return (
    <Loading>
      <HeaderSkeleton />
      <div className="card grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Bar className="h-3 w-24" />
            <Bar className="h-9 w-full" />
          </div>
        ))}
        <div className="flex justify-end gap-2 md:col-span-2">
          <Bar className="h-9 w-24" />
          <Bar className="h-9 w-28" />
        </div>
      </div>
    </Loading>
  );
}

/** Dashboard: cards de indicadores + tabelas. */
export function DashboardSkeleton() {
  return (
    <Loading>
      <HeaderSkeleton />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Bar key={i} className="h-28 rounded-theme" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Bar className="h-64 rounded-theme" />
        <Bar className="h-64 rounded-theme" />
      </div>
    </Loading>
  );
}
