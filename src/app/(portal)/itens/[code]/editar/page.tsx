import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { decodeParam } from "@/lib/format";
import { getItem, listItemGroups } from "@/lib/sap/items";
import { updateItemAction } from "../../actions";
import { ItemForm } from "../../item-form";

export default async function EditarItemPage({ params }: PageProps<"/itens/[code]/editar">) {
  await getUser();
  const code = decodeParam((await params).code);
  const [item, groups] = await Promise.all([getItem(code), listItemGroups()]);
  if (!item) notFound();
  const on = (v: string) => (v === "tYES" ? "on" : "");

  return (
    <>
      <PageHeader title={`Editar item ${item.ItemCode}`} description={item.ItemName} />
      <ItemForm
        isNew={false}
        action={updateItemAction.bind(null, item.ItemCode)}
        cancelHref={`/itens/${encodeURIComponent(item.ItemCode)}`}
        groups={groups.map((g) => ({ value: String(g.Number), label: g.GroupName }))}
        initial={{
          ItemName: item.ItemName,
          ItemsGroupCode: String(item.ItemsGroupCode),
          BarCode: item.BarCode ?? "",
          SalesUnit: item.SalesUnit ?? "",
          SalesItem: on(item.SalesItem),
          PurchaseItem: on(item.PurchaseItem),
          InventoryItem: on(item.InventoryItem),
        }}
      />
    </>
  );
}
