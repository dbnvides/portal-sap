import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader, DataTable, Pagination, SearchForm, DocStatus, type Column } from "@/components/ui";
import { formatDate, formatMoney, listParams } from "@/lib/format";
import { listDocuments, salesType, salesTypes, type DocListRow } from "@/lib/sap/sales-documents";

const columns: Column<DocListRow>[] = [
  { header: "Nº", cell: (d) => d.DocNum },
  { header: "Cliente", cell: (d) => <>{d.CardName} <span className="text-muted">({d.CardCode})</span></> },
  { header: "Data", cell: (d) => formatDate(d.DocDate) },
  { header: "Vencimento", cell: (d) => formatDate(d.DocDueDate) },
  { header: "Total", cell: (d) => formatMoney(d.DocTotal), className: "text-right" },
  { header: "Status", cell: (d) => <DocStatus status={d.DocumentStatus} cancelled={d.Cancelled} /> },
];

export default async function SalesListPage({ params, searchParams }: PageProps<"/vendas/[tipo]">) {
  const t = salesType((await params).tipo) ?? notFound();
  const { page, q, one } = listParams(await searchParams);
  const status = one("status") ?? "";
  const cfg = salesTypes[t];
  const data = await listDocuments(t, { q, status, page });

  return (
    <>
      <PageHeader
        title={cfg.label}
        actions={<Link href={`${cfg.route}/novo`} className="btn-primary"><Plus size={16} /> Novo</Link>}
      />
      <SearchForm q={q} placeholder="Cliente, código ou nº do documento">
        <select name="status" defaultValue={status} aria-label="Status" className="input w-auto">
          <option value="">Todos</option>
          <option value="aberto">Abertos</option>
          <option value="fechado">Fechados</option>
        </select>
      </SearchForm>
      <DataTable columns={columns} rows={data.rows} rowKey={(d) => d.DocEntry} rowHref={(d) => `${cfg.route}/${d.DocEntry}`} />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} params={{ q, status }} />
    </>
  );
}
