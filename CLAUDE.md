@AGENTS.md

# Portal SAP

Portal Next.js 16 sobre SAP Business One Service Layer. Plano: `PLAN.md`.

Antes de qualquer tarefa, carregue a skill **`portal`** (orquestrador): ela diz quais guias ler em `.claude/skills/portal/modulos/` e a ordem de trabalho. Catálogo e exemplos: skill **`portal-guia`**. Documentação da aplicação: `docs/`.

**Antes de concluir qualquer tarefa:** skill `verificacao-qualidade` (checklist de bugs conhecidos, teste de regressão, mutation check).

## Fundação (não reescrever)

- Auth: `src/lib/dal.ts` → `getUser()` / `requireAdmin()`. Usuários no SQLite (`src/lib/db.ts`, `src/lib/users.ts`, `node:sqlite`).
- SAP: `src/lib/service-layer.ts` → `sl<T>()`, `slPage<T>()`, `odataString()`, `key()`. Já chama `getUser()`.
- UI: `src/components/ui.tsx`, `submit-button.tsx`, `menu.ts`. Formatação: `src/lib/format.ts` (`formatMoney`, `formatDate`, `listParams`).
- `cacheComponents: true`: o layout `(portal)` já envolve as páginas em `<Suspense>`, então pages podem dar `await` em `searchParams`/dados. Não usar `'use cache'` em dados do SAP (ERP precisa de dado fresco).
- Módulo SAP novo: tipos + funções em `src/lib/sap/<modulo>.ts`, páginas em `src/app/(portal)/<rota>/`, actions em `actions.ts` da rota.
