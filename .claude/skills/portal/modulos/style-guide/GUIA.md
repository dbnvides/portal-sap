---
name: style-guide
description: Portal visual style guide and per-client theming (color tokens, sidebar, tables, forms, buttons). Use before writing any UI/className, and when adding or changing a client's colors.
---

# Style guide — portal

## Tema por cliente

- Tokens em `src/styles/themes.css`. Um bloco `[data-theme="<cliente>"]` por cliente; só sobrescreve o que muda.
- Ativo via `.env`: `CLIENT_THEME=agro`. `src/app/layout.tsx` põe `data-theme` no `<html>`. **Aplicado no build** (`<html>` é estático): trocou o tema, rode `npm run build` de novo. Um build por cliente.
- Novo cliente = copiar bloco, renomear, trocar cores. Zero mudança em componente.
- Logo por cliente: `public/clients/<cliente>/logo.svg` (fallback `public/clients/default/logo.svg`).

## Tokens (classe Tailwind ← variável)

| Uso | Classe |
|---|---|
| Ação principal | `bg-primary text-primary-foreground` |
| Destaque | `text-accent`, `bg-accent` |
| Fundo da página | `bg-background` |
| Card / tabela / form | `bg-surface border border-border` |
| Texto | `text-foreground`; secundário `text-muted` |
| Sidebar | `bg-sidebar text-sidebar-foreground`; item ativo `bg-sidebar-active text-sidebar-active-foreground` |
| Status | `text-success`, `text-warning`, `text-danger` |
| Cantos | `rounded-theme` |

**Proibido:** hex/rgb em componente, `bg-blue-600` e afins de paleta fixa. Sempre token.

## Padrões de componente

Classes prontas em `src/app/globals.css` (`@utility`): `btn-primary`, `btn-secondary`, `btn-danger`, `input`, `label`, `card`.
Componentes prontos — **reusar, não recriar**:
- `src/components/ui.tsx`: `PageHeader`, `DataTable`, `Pagination`, `SearchForm`, `Badge`, `DocStatus`, `Field`, `SelectField`, `Alert`, `Detail`
- `src/components/submit-button.tsx`: `SubmitButton` (spinner + bloqueia clique duplo)
- `src/components/skeletons.tsx`: `ListSkeleton`, `DetailSkeleton`, `FormSkeleton`, `DashboardSkeleton` — usados nos `loading.tsx`
- Menu: `src/components/menu.ts` (única fonte do menu)

Regras:
- **Tabela:** sempre `DataTable` + `Pagination`.
- **Status de documento:** `DocStatus`.
- **Layout:** sidebar fixa `w-64` (drawer `<md`), conteúdo `p-6`, título via `PageHeader`.
- **Form:** grid `grid gap-4 md:grid-cols-2` dentro de `card`; ações no rodapé alinhadas à direita.
- **Ícones:** `lucide-react`, tamanho 16–18.

## Acessibilidade

Contraste mínimo 4.5:1 entre `primary` e `primary-foreground` ao criar tema. Foco visível sempre. `aria-current="page"` no item ativo da sidebar.
