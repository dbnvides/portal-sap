---
name: portal
description: Orchestrator for all work on this SAP B1 portal (Next.js 16 + Service Layer + SQLite auth). Use FIRST for any task in this repo — new page/module, form, Server Action, auth change, SAP query, styling/client theme, tests. It tells which module guides to load and in what order.
---

# Portal — orquestrador

Esta skill decide **quais guias carregar** e **em que ordem trabalhar**. Os guias ficam em `modulos/`:

| Guia | Arquivo |
|---|---|
| App Router | `modulos/nextjs-app-router/GUIA.md` |
| Autenticação | `modulos/nextjs-auth/GUIA.md` |
| Service Layer | `modulos/sap-service-layer/GUIA.md` |
| Style guide | `modulos/style-guide/GUIA.md` |
| Testes | `modulos/testes/GUIA.md` |

Catálogo com exemplos: skill `portal-guia`. Documentação da aplicação: `docs/`.

## 1. Classifique a tarefa e leia os guias

| Tarefa | Leia (nesta ordem) |
|---|---|
| Nova tela/módulo que lê ou grava no SAP | sap-service-layer → nextjs-app-router → nextjs-auth → style-guide → testes |
| Form / Server Action | nextjs-app-router → nextjs-auth → style-guide |
| Login, sessão, permissão, proxy, usuários | nextjs-auth → nextjs-app-router |
| Só visual / tema de cliente | style-guide |
| Consulta OData / erro do SL | sap-service-layer |
| Bug | guia da área + testes |

Next 16 tem breaking changes: em dúvida, os `references/` dos guias são as docs oficiais (cópia de `node_modules/next/dist/docs/`).

## 2. Ordem de trabalho para um módulo SAP novo

1. **Dados** — `src/lib/sap/<modulo>.ts` (`server-only`): tipos DTO + **leitura por SQL** (query parametrizada ou procedure `PORTAL_*`, via `src/lib/sql.ts`) + **escrita por SL** (`sl`, chaves via `key`). Nunca GET no SL para tela, nunca escrita por SQL.
2. **Telas** — `src/app/(portal)/<rota>/page.tsx` (lista com `DataTable`+`Pagination`+`SearchForm`), `[id]/page.tsx` (detalhe por SQL, `notFound()` se `null`), `novo/page.tsx`; `loading.tsx` de uma linha em cada pasta.
3. **Mutations** — `actions.ts` com `'use server'`: `getUser()`/`requireAdmin()` → zod → `try/catch SlError` → `{ error }` ou `redirect`.
4. **Form** — Client Component local com `useActionState` + `SubmitButton`.
5. **Menu** — uma linha em `src/components/menu.ts`.
6. **Mock + E2E** — endpoint em `scripts/mock-sl.mjs`, `check` em `scripts/e2e.mjs`.
7. **Validar** — skill `verificacao-qualidade` (checklist + regressão + mutation check); `npm run lint` e `npm run build` limpos; e2e verde.
8. **Docs** — atualize `docs/modulos.md` (rota, entidade SL, ações).

## 3. Regras que valem sempre

- SAP: GET = query/procedure no banco; POST/PATCH/Close/Cancel = Service Layer. Detalhes em `modulos/sap-service-layer/GUIA.md`.
- Reusar a fundação: `src/lib/{service-layer,sql,dal,format}.ts`, `src/components/{ui.tsx,submit-button.tsx,menu.ts}`. Não recriar.
- Nada de `src/lib/*` (db, session, dal, service-layer, sap) importado em arquivo `'use client'`.
- Sem `'use cache'` em dados do SAP. O layout `(portal)` já envolve páginas em `<Suspense>`.
- Sem cor fixa: só tokens do style guide.
- Sem dependência nova sem motivo claro.
- Textos de UI em pt-BR.

## 4. Trabalho em paralelo (vários agentes)

Divida por módulo (pasta própria em `src/app/(portal)/<rota>` + `src/lib/sap/<modulo>.ts`). Arquivos compartilhados (fundação, menu, globals, package.json) ficam com um só dono. Agentes paralelos validam com `npx next typegen && npx tsc --noEmit` + `npx eslint <seus caminhos>` — **build só no fim**, por um único agente.
