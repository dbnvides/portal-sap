import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, DataTable, PageHeader, Pagination, SearchForm, type Column } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { formatDate, formatMoney, listParams } from "@/lib/format";
import { getPayments, type Payment } from "@/lib/sap/finance";

const columns: Column<Payment>[] = [
  { header: "Nº", cell: (r) => r.DocNum },
  { header: "Cliente", cell: (r) => `${r.CardCode} · ${r.CardName}` },
  { header: "Data", cell: (r) => formatDate(r.DocDate) },
  { header: "Forma", cell: (r) => r.method },
  { header: "Total", cell: (r) => formatMoney(r.total), className: "text-right" },
  { header: "Status", cell: (r) => (r.Cancelled === "tYES" ? <Badge tone="danger">Cancelado</Badge> : <Badge tone="success">Ativo</Badge>) },
];

export default async function PaymentsPage({ searchParams }: PageProps<"/financeiro/recebimentos">) {
  await getUser();
  const { page, q } = listParams(await searchParams);
  const data = await getPayments({ q, page });

  return (
    <>
      <PageHeader
        title="Recebimentos"
        description="Contas a receber baixadas"
        actions={<Link href="/financeiro/recebimentos/novo" className="btn-primary"><Plus size={16} /> Novo recebimento</Link>}
      />
      <SearchForm q={q} placeholder="Buscar cliente por código ou nome..." />
      <DataTable columns={columns} rows={data.rows} rowKey={(r) => r.DocEntry} rowHref={(r) => `/financeiro/recebimentos/${r.DocEntry}`} />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} params={q ? { q } : {}} />
    </>
  );
}
