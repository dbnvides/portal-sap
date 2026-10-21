import Link from "next/link";
import { Badge, DataTable, PageHeader, Pagination, SearchForm, type Column } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { formatDate, formatMoney, listParams } from "@/lib/format";
import { getReceivables, type OpenInvoice } from "@/lib/sap/finance";

export default async function ReceivablesPage({ searchParams }: PageProps<"/financeiro/receber">) {
  await getUser();
  const { page, q, one } = listParams(await searchParams);
  const situacao = one("situacao") ?? "";
  const data = await getReceivables({ q, situacao, page });
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (situacao) params.situacao = situacao;
  const pageBalance = data.rows.reduce((s, r) => s + Math.round(r.balance * 100), 0) / 100;

  const columns: Column<OpenInvoice>[] = [
    { header: "Nº", cell: (r) => r.DocNum },
    { header: "Cliente", cell: (r) => `${r.CardCode} · ${r.CardName}` },
    { header: "Emissão", cell: (r) => formatDate(r.DocDate) },
    {
      header: "Vencimento",
      cell: (r) => (
        <span className="flex items-center gap-2">
          {formatDate(r.DocDueDate)}
          {r.DocDueDate.slice(0, 10) < data.today && <Badge tone="danger">Vencida</Badge>}
        </span>
      ),
    },
    { header: "Total", cell: (r) => formatMoney(r.DocTotal), className: "text-right" },
    { header: "Pago", cell: (r) => formatMoney(r.PaidToDate), className: "text-right" },
    { header: "Saldo", cell: (r) => formatMoney(r.balance), className: "text-right font-medium" },
    {
      header: "",
      cell: (r) => (
        <Link className="text-primary hover:underline" href={`/financeiro/recebimentos/novo?${new URLSearchParams({ cliente: r.CardCode, nota: String(r.DocEntry) })}`}>
          Receber
        </Link>
      ),
      className: "text-right",
    },
  ];

  return (
    <>
      <PageHeader title="Contas a receber" description="Notas fiscais de saída em aberto" />
      <SearchForm q={q} placeholder="Buscar cliente por código ou nome...">
        <select name="situacao" defaultValue={situacao} aria-label="Situação" className="input w-auto">
          <option value="">Todas</option>
          <option value="vencidas">Vencidas</option>
          <option value="a-vencer">A vencer</option>
        </select>
      </SearchForm>
      <DataTable columns={columns} rows={data.rows} rowKey={(r) => r.DocEntry} rowHref={(r) => `/vendas/notas/${r.DocEntry}`} />
      <p className="mt-4 text-right text-sm text-muted">
        Saldo desta página: <span className="font-semibold text-foreground">{formatMoney(pageBalance)}</span>
      </p>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} params={params} />
    </>
  );
}
