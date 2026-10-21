import Link from "next/link";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { Search } from "lucide-react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

export function DataTable<T>({
  columns, rows, rowKey, rowHref, empty = "Nenhum registro encontrado.",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  rowHref?: (row: T) => string;
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-theme border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted">
            {columns.map((c) => (
              <th key={c.header} className={`px-4 py-3 font-medium ${c.className ?? ""}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-muted">{empty}</td></tr>
          )}
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr key={rowKey(row)} className="border-b border-border last:border-0 hover:bg-background">
                {columns.map((c, i) => (
                  <td key={c.header} className={`px-4 py-3 ${c.className ?? ""}`}>
                    {href && i === 0 ? <Link href={href} className="font-medium text-primary hover:underline">{c.cell(row)}</Link> : c.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Paginação por `?page=`. Mantém os outros params da URL. */
export function Pagination({ page, pageSize, total, params = {} }: {
  page: number; pageSize: number; total: number; params?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => `?${new URLSearchParams({ ...params, page: String(p) })}`;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>{total} registro(s) · página {page} de {pages}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className="btn-secondary px-3 py-1.5" href={href(page - 1)}>Anterior</Link> : <span className="btn-secondary px-3 py-1.5 opacity-50">Anterior</span>}
        {page < pages ? <Link className="btn-secondary px-3 py-1.5" href={href(page + 1)}>Próxima</Link> : <span className="btn-secondary px-3 py-1.5 opacity-50">Próxima</span>}
      </div>
    </div>
  );
}

/** Busca via GET nativo (`?q=`), sem JS. `children` = filtros extras (selects com `name`). */
export function SearchForm({ q, placeholder = "Buscar...", children }: { q?: string; placeholder?: string; children?: ReactNode }) {
  return (
    <form className="mb-4 flex flex-wrap gap-2" role="search">
      <div className="relative min-w-64 flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} className="input pl-9" />
      </div>
      {children}
      <button className="btn-secondary">Filtrar</button>
    </form>
  );
}

const tones = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-muted/10 text-muted",
};

export function Badge({ tone = "muted", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** Status de documento SAP (DocumentStatus + Cancelled). */
export function DocStatus({ status, cancelled }: { status?: string; cancelled?: string }) {
  if (cancelled === "tYES") return <Badge tone="danger">Cancelado</Badge>;
  if (status === "bost_Close") return <Badge tone="muted">Fechado</Badge>;
  return <Badge tone="primary">Aberto</Badge>;
}

export function Field({ label, name, error, ...props }: { label: string; name: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} className="input" aria-invalid={!!error} {...props} />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function SelectField({ label, name, error, options, ...props }: {
  label: string; name: string; error?: string; options: { value: string; label: string }[];
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <select id={name} name={name} className="input" aria-invalid={!!error} {...props}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success"; children: ReactNode }) {
  return (
    <div role="alert" className={`rounded-theme border px-4 py-3 text-sm ${tone === "danger" ? "border-danger/30 bg-danger/10 text-danger" : "border-success/30 bg-success/10 text-success"}`}>
      {children}
    </div>
  );
}

/** Rótulo + valor para telas de detalhe. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children ?? "—"}</dd>
    </div>
  );
}
