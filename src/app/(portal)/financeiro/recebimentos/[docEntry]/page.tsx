import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, DataTable, Detail, PageHeader } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { formatDate, formatMoney } from "@/lib/format";
import { getPayment } from "@/lib/sap/finance";
import { CancelButton } from "./cancel-button";

export default async function PaymentPage({ params }: PageProps<"/financeiro/recebimentos/[docEntry]">) {
  await getUser();
  const docEntry = Number((await params).docEntry);
  if (!Number.isInteger(docEntry) || docEntry <= 0) notFound();
  const p = await getPayment(docEntry);
  if (!p) notFound();
  const cancelled = p.Cancelled === "tYES";

  return (
    <>
      <PageHeader
        title={`Recebimento ${p.DocNum}`}
        description={`${p.CardCode} · ${p.CardName}`}
        actions={
          <>
            <Link href="/financeiro/recebimentos" className="btn-secondary">Voltar</Link>
            {!cancelled && <CancelButton docEntry={p.DocEntry} />}
          </>
        }
      />
      <dl className="card mb-6 grid gap-4 md:grid-cols-4">
        <Detail label="Status">{cancelled ? <Badge tone="danger">Cancelado</Badge> : <Badge tone="success">Ativo</Badge>}</Detail>
        <Detail label="Data">{formatDate(p.DocDate)}</Detail>
        <Detail label="Forma">{p.method}</Detail>
        <Detail label="Total">{formatMoney(p.total)}</Detail>
        {p.TransferSum > 0 && <Detail label="Conta transferência">{p.TransferAccount}</Detail>}
        {p.TransferSum > 0 && <Detail label="Data transferência">{formatDate(p.TransferDate)}</Detail>}
        {p.CashSum > 0 && <Detail label="Conta caixa">{p.CashAccount}</Detail>}
        {p.Remarks && <Detail label="Observações">{p.Remarks}</Detail>}
      </dl>
      <h2 className="mb-3 text-lg font-semibold">Notas baixadas</h2>
      <DataTable
        rows={p.PaymentInvoices}
        rowKey={(r) => `${r.InvoiceType}-${r.DocEntry}`}
        rowHref={(r) => (r.InvoiceType === "it_Invoice" ? `/vendas/notas/${r.DocEntry}` : "")}
        columns={[
          { header: "Documento (DocEntry)", cell: (r) => r.DocEntry },
          { header: "Tipo", cell: (r) => (r.InvoiceType === "it_Invoice" ? "Nota fiscal de saída" : r.InvoiceType) },
          { header: "Valor aplicado", cell: (r) => formatMoney(r.SumApplied), className: "text-right" },
        ]}
      />
    </>
  );
}
