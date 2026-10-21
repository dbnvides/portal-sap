import { Badge } from "@/components/ui";
import type { ItemRow } from "@/lib/sap/items";

export function ItemStatus({ item }: { item: Pick<ItemRow, "Valid" | "Frozen"> }) {
  if (item.Frozen === "tYES") return <Badge tone="warning">Bloqueado</Badge>;
  if (item.Valid === "tNO") return <Badge tone="muted">Inativo</Badge>;
  return <Badge tone="success">Ativo</Badge>;
}
