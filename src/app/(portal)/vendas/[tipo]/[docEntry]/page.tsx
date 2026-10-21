import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { PageHeader, DataTable, DocStatus, Detail, type Column } from "@/components/ui";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { getDocument, salesType, salesTypes, type DocLine } from "@/lib/sap/sales-documents";
import { DocOpButton } from "../../doc-op-button";

const columns: Column<DocLine>[] = [
  { header: "Item", cell: (l) => l.ItemCode },
  { header: "Descrição", cell: (l) => l.ItemDescription },
  { header: "Depósito", cell: (l) => l.WarehouseCode },
  { header: "Quantidade", cell: (l) => formatNumber(l.Quantity), className: "text-right" },
  { header: "Preço", cell: (l) => formatMoney(l.UnitPrice), className: "text-right" },
  { header: "Total", cell: (l) => formatMoney(l.LineTotal), className: "text-right" },
];

export default async function SalesDocumentPage({ params }: PageProps<"/vendas/[tipo]/[docEntry]">) {
  const { tipo, docEntry } = await params;
  const t = salesType(tipo) ?? notFound();
  const entry = Number(docEntry);
  if (!Number.isInteger(entry) || entry <= 0) notFound();
  const doc = (await getDocument(t, entry)) ?? notFound();
  const cfg = salesTypes[t];
  const open = doc.DocumentStatus === "bost_Open" && doc.Cancelled !== "tYES";
  const linesTotal = doc.DocumentLines.reduce((s, l) => s + l.LineTotal, 0);

  return (
    <>
      <PageHeader
        title={`${cfg.singular} nº ${doc.DocNum}`}
        description={`${doc.CardName} (${doc.CardCode})`}
        actions={open && (
          <>
            {cfg.next.map((n) => (
              <Link key={n} href={`${salesTypes[n].route}/novo?base=${t}&baseEntry=${doc.DocEntry}`} className="btn-secondary">
                <CopyPlus size={16} /> Gerar {salesTypes[n].singular.toLowerCase()}
              </Link>
            ))}
            <DocOpButton tipo={t} docEntry={doc.DocEntry} op="close" label="Fechar" confirmText="Fechar este documento?" />
            <DocOpButton tipo={t} docEntry={doc.DocEntry} op="cancel" label="Cancelar" confirmText="Cancelar este documento? Esta ação não pode ser desfeita." />
          </>
        )}
      />
      <dl className="card mb-6 grid gap-4 md:grid-cols-4">
        <Detail label="Status"><DocStatus status={doc.DocumentStatus} cancelled={doc.Cancelled} /></Detail>
        <Detail label="Data">{formatDate(doc.DocDate)}</Detail>
        <Detail label="Vencimento">{formatDate(doc.DocDueDate)}</Detail>
        <Detail label="Total">{formatMoney(doc.DocTotal)}</Detail>
        {doc.Comments && <div className="md:col-span-4"><Detail label="Observações">{doc.Comments}</Detail></div>}
      </dl>
      <DataTable columns={columns} rows={doc.DocumentLines} rowKey={(l) => l.LineNum} empty="Documento sem linhas." />
      <dl className="mt-4 ml-auto grid max-w-xs gap-2 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Total das linhas</dt><dd>{formatMoney(linesTotal)}</dd></div>
        <div className="flex justify-between font-semibold"><dt>Total do documento</dt><dd>{formatMoney(doc.DocTotal)}</dd></div>
      </dl>
      <Link href={cfg.route} className="btn-secondary mt-6">Voltar</Link>
    </>
  );
}
