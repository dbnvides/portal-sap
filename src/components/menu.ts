import {
  LayoutDashboard, Package, Users, FileText, ShoppingCart, Truck, Receipt, Undo2,
  Wallet, HandCoins, ShieldCheck, type LucideIcon,
} from "lucide-react";

export type MenuItem = { label: string; href: string; icon: LucideIcon; adminOnly?: boolean };
export type MenuGroup = { label?: string; items: MenuItem[] };

/** Menu único do portal. Nova página = nova linha aqui. */
export const menu: MenuGroup[] = [
  { items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }] },
  {
    label: "Cadastros",
    items: [
      { label: "Itens", href: "/itens", icon: Package },
      { label: "Parceiros de negócio", href: "/parceiros", icon: Users },
    ],
  },
  {
    label: "Vendas",
    items: [
      { label: "Cotações", href: "/vendas/cotacoes", icon: FileText },
      { label: "Pedidos de venda", href: "/vendas/pedidos", icon: ShoppingCart },
      { label: "Entregas", href: "/vendas/entregas", icon: Truck },
      { label: "Notas fiscais de saída", href: "/vendas/notas", icon: Receipt },
      { label: "Devoluções", href: "/vendas/devolucoes", icon: Undo2 },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Contas a receber", href: "/financeiro/receber", icon: Wallet },
      { label: "Recebimentos", href: "/financeiro/recebimentos", icon: HandCoins },
    ],
  },
  {
    label: "Administração",
    items: [{ label: "Usuários", href: "/admin/usuarios", icon: ShieldCheck, adminOnly: true }],
  },
];
