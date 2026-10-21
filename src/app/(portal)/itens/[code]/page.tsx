import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DataTable, Detail, PageHeader } from "@/components/ui";
import { decodeParam, formatNumber } from "@/lib/format";
import { getUser } from "@/lib/dal";
import { getItem, listItemGroups } from "@/lib/sap/items";
import { ItemStatus } from "../item-status";

const yes = (v: string) => (v === "tYES" ? "Sim" : "Não");

export default async function ItemPage({ params }: PageProps<"/itens/[code]">) {
  await getUser();
  const code = decodeParam((await params).code);
  const [item, groups] = await Promise.all([getItem(code), listItemGroups()]);
  if (!item) notFound();
  const group = groups.find((g) => g.Number === item.ItemsGroupCode)?.GroupName ?? item.ItemsGroupCode;

  return (
    <>
      <PageHeader
        title={item.ItemName}
        description={`Item ${item.ItemCode}`}
        actions={
          <>
            <Link href="/itens" className="btn-secondary">Voltar</Link>
            <Link href={`/itens/${encodeURIComponent(item.ItemCode)}/editar`} className="btn-primary"><Pencil size={16} /> Editar</Link>
          </>
        }
      />
      <dl className="card mb-6 grid gap-4 md:grid-cols-3">
        <Detail label="Código">{item.ItemCode}</Detail>
        <Detail label="Grupo">{group}</Detail>
        <Detail label="Status"><ItemStatus item={item} /></Detail>
        <Detail label="Estoque total">{formatNumber(item.QuantityOnStock)}</Detail>
        <Detail label="Código de barras">{item.BarCode || null}</Detail>
        <Detail label="Unidade de venda">{item.SalesUnit || null}</Detail>
        <Detail label="Item de venda">{yes(item.SalesItem)}</Detail>
        <Detail label="Item de compra">{yes(item.PurchaseItem)}</Detail>
        <Detail label="Item de estoque">{yes(item.InventoryItem)}</Detail>
      </dl>
      <h2 className="mb-3 text-lg font-semibold">Estoque por depósito</h2>
      <DataTable
        columns={[
          { header: "Depósito", cell: (w) => w.WarehouseCode },
          { header: "Em estoque", cell: (w) => formatNumber(w.InStock), className: "text-right" },
          { header: "Comprometido", cell: (w) => formatNumber(w.Committed), className: "text-right" },
          { header: "Pedido", cell: (w) => formatNumber(w.Ordered), className: "text-right" },
          { header: "Disponível", cell: (w) => formatNumber(w.InStock - w.Committed + w.Ordered), className: "text-right" },
        ]}
        rows={item.ItemWarehouseInfoCollection ?? []}
        rowKey={(w) => w.WarehouseCode}
        empty="Nenhum depósito vinculado."
      />
    </>
  );
}
