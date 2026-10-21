import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { listParams } from "@/lib/format";
import { canCopy, getDocument, salesType, salesTypes, searchCustomers, searchItems } from "@/lib/sap/sales-documents";
import { today } from "@/lib/today";
import { DocumentForm, type FormLine } from "../../document-form";

export default async function NewSalesDocumentPage({ params, searchParams }: PageProps<"/vendas/[tipo]/novo">) {
  const t = salesType((await params).tipo) ?? notFound();
  const { one } = listParams(await searchParams);
  const cfg = salesTypes[t];

  // ?base=<tipo>&baseEntry=<n>: copiar para (linhas abertas referenciam o documento de origem).
  let initial: { CardCode: string; Comments: string; lines: FormLine[] } = { CardCode: "", Comments: "", lines: [] };
  let description: string | undefined;
  const base = salesType(one("base"));
  if (base) {
    const baseEntry = Number(one("baseEntry"));
    if (!canCopy(base, t) || !Number.isInteger(baseEntry) || baseEntry <= 0) notFound();
    const doc = (await getDocument(base, baseEntry)) ?? notFound();
    description = `A partir de ${salesTypes[base].singular.toLowerCase()} nº ${doc.DocNum}`;
    initial = {
      CardCode: doc.CardCode,
      Comments: `Baseado em ${salesTypes[base].singular} nº ${doc.DocNum}`,
      lines: doc.DocumentLines.filter((l) => l.LineStatus !== "bost_Close").map((l) => ({
        ItemCode: l.ItemCode,
        ItemDescription: l.ItemDescription,
        Quantity: String(l.RemainingOpenQuantity ?? l.Quantity),
        UnitPrice: String(l.UnitPrice),
        WarehouseCode: l.WarehouseCode ?? "",
        BaseType: salesTypes[base].objType,
        BaseEntry: doc.DocEntry,
        BaseLine: l.LineNum,
      })),
    };
  }

  const [customers, items, date] = await Promise.all([searchCustomers(), searchItems(), today()]);

  return (
    <>
      <PageHeader title={cfg.newLabel} description={description} />
      <DocumentForm tipo={t} cancelHref={cfg.route} today={date} customers={customers} items={items} initial={initial} />
    </>
  );
}
