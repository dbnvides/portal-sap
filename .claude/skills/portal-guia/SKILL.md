---
name: portal-guia
description: Catalog of this portal's skills/guides — what each one does, when to use it, and a worked example flow (adding a new SAP module end to end). Use when someone asks "which skills exist", "how do I use the skills", "show me the flow", or is new to the repo.
---

# Guia das skills do portal

## Estrutura

```
.claude/skills/
├── portal/                      ← ORQUESTRADOR (carregue primeiro)
│   ├── SKILL.md
│   └── modulos/
│       ├── nextjs-app-router/   GUIA.md + references/ (docs oficiais Next 16)
│       ├── nextjs-auth/         GUIA.md + references/ (docs oficiais Next 16)
│       ├── sap-service-layer/   GUIA.md
│       ├── style-guide/         GUIA.md
│       └── testes/              GUIA.md
├── portal-guia/                 ← ESTE catálogo
└── verificacao-qualidade/       ← checklist obrigatória antes de concluir (cópia da skill do usuário)
```

Só `portal`, `portal-guia` e `verificacao-qualidade` são skills carregáveis (o Claude Code descobre skills no primeiro nível de `.claude/skills/`). Os módulos são guias que o orquestrador manda ler.

## O que cada uma faz

| Skill / guia | Faz | Use quando |
|---|---|---|
| **portal** | Classifica a tarefa, diz quais guias ler e a ordem de trabalho; regras globais e de trabalho em paralelo | Sempre, antes de qualquer tarefa no repo |
| **portal-guia** | Catálogo + fluxo de exemplo | Onboarding, dúvida sobre qual guia usar |
| nextjs-app-router | Estrutura de pastas, Server/Client Components, fetch no servidor, Server Actions, forms com `useActionState`, `params` como Promise, env vars | Criar página, rota, componente, action, form |
| nextjs-auth | `proxy.ts` (checagem otimista), DAL (`getUser`/`requireAdmin`), cookie de sessão, Cache Components + Suspense, DTO | Login, sessão, permissão, qualquer leitura de dado protegido |
| sap-service-layer | **Leitura por SQL (query/procedure), escrita por SL**; pool `mssql`, parâmetros, paginação `OFFSET/FETCH`, procedures `PORTAL_*`; cliente `sl`, usuário técnico, tabelas × entidades por módulo, `DocEntry` × `DocNum`, Close/Cancel, formato de erro | Qualquer leitura ou gravação no SAP |
| style-guide | Tokens de cor por cliente (`themes.css`), classes `btn-*`/`input`/`card`, componentes `ui.tsx`, acessibilidade | Qualquer `className`, novo cliente/tema |
| testes | lint, build, mock do SL, E2E Playwright e as regras de manter mock/e2e em dia | Validar qualquer mudança |
| **verificacao-qualidade** | Checklist de bugs já encontrados (auth, OData, datas), regressão obrigatória, mutation check | Antes de concluir qualquer tarefa |

## Exemplo de fluxo — "Criar módulo Pedidos de compra"

**Pedido:** "Quero listar e criar pedidos de compra."

1. **portal** → tarefa = *nova tela que lê e grava no SAP* → ler sap-service-layer, nextjs-app-router, nextjs-auth, style-guide, testes.
2. **sap-service-layer** → leitura em `OPOR`/`POR1` (SQL), gravação na entidade SL `PurchaseOrders` (ObjType 22, `DocumentLines`); fornecedor = `OCRD.CardType = 'S'`.
3. **Dados** — módulo `src/lib/sap/purchase-documents.ts`: lista/detalhe por SQL parametrizado, criação por `sl("PurchaseOrders", { method: "POST", body })`.
   ```ts
   export async function listPurchaseOrders({ q, page }: { q: string; page: number }) {
     const pageSize = 20;
     const { recordset } = await (await sqlPool()).request()
       .input("q", q ? `%${q}%` : null)
       .input("skip", (page - 1) * pageSize)
       .input("take", pageSize)
       .query<DocListRow & { Total: number }>(`
         select T0.DocEntry, T0.DocNum, T0.CardCode, T0.CardName, T0.DocDate, T0.DocTotal,
                T0.DocStatus, T0.CANCELED, count(*) over() as Total
         from OPOR T0
         where @q is null or T0.CardName like @q
         order by T0.DocEntry desc
         offset @skip rows fetch next @take rows only`);
     return { rows: recordset, total: recordset[0]?.Total ?? 0, page, pageSize };
   }
   ```
4. **nextjs-app-router** → `src/app/(portal)/compras/pedidos/page.tsx` (lista), `[docEntry]/page.tsx`, `novo/page.tsx`, `actions.ts`.
5. **nextjs-auth** → cada action começa com `await getUser()`; validar com zod; nada de `lib/` em Client Component.
6. **style-guide** → `PageHeader`, `DataTable`, `Pagination`, `DocStatus`, `btn-primary`; nenhuma cor fixa.
7. **Menu** → nova linha em `src/components/menu.ts` (grupo "Compras", ícone `lucide-react`).
8. **testes** → `PurchaseOrders` no seed do `scripts/mock-sl.mjs`; `check("compras: criar pedido", …)` em `scripts/e2e.mjs`; `npm run lint`, `npm run build`, `npm run e2e`.
9. **Docs** → linha nova em `docs/modulos.md`.

## Exemplo rápido — "Novo cliente com cores próprias"

1. **portal** → *só visual / tema* → style-guide.
2. Copiar um bloco em `src/styles/themes.css` → `[data-theme="acme"] { --primary: …; --sidebar: … }`.
3. `.env`: `CLIENT_THEME=acme`, `CLIENT_NAME=Acme`; `npm run build` (o tema entra no build).
4. Conferir contraste `primary` × `primary-foreground` ≥ 4.5:1.
