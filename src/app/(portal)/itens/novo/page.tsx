import { PageHeader } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { listItemGroups } from "@/lib/sap/items";
import { createItemAction } from "../actions";
import { ItemForm } from "../item-form";

export default async function NovoItemPage() {
  await getUser();
  const groups = await listItemGroups();
  return (
    <>
      <PageHeader title="Novo item" />
      <ItemForm
        isNew
        action={createItemAction}
        cancelHref="/itens"
        groups={[{ value: "", label: "Selecione..." }, ...groups.map((g) => ({ value: String(g.Number), label: g.GroupName }))]}
        initial={{ SalesItem: "on", PurchaseItem: "on", InventoryItem: "on" }}
      />
    </>
  );
}
