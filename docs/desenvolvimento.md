# Desenvolvimento

## Rodar localmente

```bash
npm install
cp .env.example .env.local       # SESSION_SECRET, ADMIN_PASSWORD
npm run mock:sl                  # terminal 1 — sem SAP real
npm run dev                      # terminal 2 — http://localhost:3000
```

Com mock, no `.env.local`: `SAP_SL_URL=http://localhost:50001/b1s/v2` e qualquer valor em `SAP_COMPANY_DB`, `SAP_USER`, `SAP_PASSWORD`.
Com SAP real: dados do Service Layer; se o certificado for self-signed, `SAP_SL_INSECURE_TLS=true`.

## Mock do Service Layer (`scripts/mock-sl.mjs`)

Node puro, sem dependências, porta `MOCK_SL_PORT` (padrão 50001).

- Dados de exemplo em pt-BR: 25 itens, 24 parceiros, documentos dos 5 tipos de venda, 2 recebimentos.
- Suporta: `POST /Login` com cookie `B1SESSION`; `$select`, `$top`, `$skip`, `$orderby`, `$filter` (`eq ne lt ge and or contains()` e parênteses), `/$count`, `$apply` aggregate; GET/POST/PATCH; `Close`/`Cancel`.
- Regras simuladas: documento gerado a partir de outro baixa a quantidade em aberto da origem; recebimento atualiza `PaidToDate` e fecha a nota quitada; cancelar reverte.
- Dados em memória: **reiniciar = voltar ao seed**.
- `MOCK_SL_LOG=0` silencia o log; `node scripts/mock-sl.mjs --check` testa o parser de filtro.
- Não simula: impostos, diferenças do SL v1, permissões do SAP.

## Testes

| Nível | Comando |
|---|---|
| Lint | `npm run lint` |
| Tipos | `npx next typegen && npx tsc --noEmit` |
| Build | `npm run build` — pega erros de Suspense/Cache Components |
| Ponta a ponta | `npm run e2e` |

E2E (`scripts/e2e.mjs`, Playwright headless):

```bash
npm run mock:sl                    # reinicie antes de cada execução
npm run build
SAP_SL_URL=http://localhost:50001/b1s/v2 SAP_COMPANY_DB=X SAP_USER=X SAP_PASSWORD=X npx next start -p 3100
npx playwright install chromium    # uma vez
npm run e2e                        # E2E_URL, ADMIN_EMAIL, ADMIN_PASSWORD, E2E_THEME opcionais
```

Cobre: proxy e login (open redirect com `//`, `/\` e TAB; e-mail com espaços), usuário desativado com sessão aberta (sem loop), busca com espaço, logout, dashboard, listas/busca/filtros/paginação/detalhe/criar/editar de itens e parceiros, os 5 tipos de venda (criar, gerar a partir de, fechar, cancelar), contas a receber, recebimento com baixa e cancelamento, recebimento com 22 notas (> página padrão do SL), nota repetida forjada, usuários e bloqueio de não-admin, relogin no SL após 401, tema.

### Verificação obrigatória

Antes de concluir qualquer mudança, siga a skill **`verificacao-qualidade`** (`.claude/skills/verificacao-qualidade/`, versionada no repo): checklist de bugs já encontrados neste projeto (auth, OData, datas), teste de regressão para todo bug corrigido e *mutation check* — reverter a correção e confirmar que o teste falha.

## Criar um módulo novo

Siga a skill `portal` (orquestrador) — resumo:

1. `src/lib/sap/<modulo>.ts` com `import "server-only"`, tipos DTO e funções usando `sl`/`slPage`. `$select` sempre; texto em filtro via `odataString`; chave via `key`.
2. `src/app/(portal)/<rota>/page.tsx` (lista), `[id]/page.tsx` (detalhe, `slFind` + `notFound()`), `novo/page.tsx`. Em cada pasta, `loading.tsx` de uma linha: `export { ListSkeleton as default } from "@/components/skeletons";` (`DetailSkeleton`/`FormSkeleton` conforme a tela).
3. `actions.ts` com `'use server'`: `await getUser()` → zod → `try { … } catch (e) { if (e instanceof SlError) return { error: e.message } }` → `redirect(...)`.
4. Form client com `useActionState` e `SubmitButton`; componentes de `src/components/ui.tsx`.
5. Linha no `src/components/menu.ts`.
6. Entidade no `scripts/mock-sl.mjs` + `check(...)` no `scripts/e2e.mjs`.
7. `npm run lint`, `npm run build`, `npm run e2e`.
8. Atualizar `docs/modulos.md`.

Exemplo completo: skill `portal-guia`.

## Convenções

- **Server Component por padrão.** `'use client'` só para estado/eventos, em arquivos folha.
- **`params`/`searchParams` são Promises** (`const { id } = await params`). Tipos: `PageProps<'/rota/[id]'>` (gerados pelo Next).
- **Sem `'use cache'`** em dados do SAP.
- **Sem cor fixa** — só tokens (`bg-primary`, `text-muted`, `border-border`…) e classes `btn-primary`, `btn-secondary`, `btn-danger`, `input`, `label`, `card`.
- **pt-BR** em toda a UI; datas e moeda via `src/lib/format.ts`.
- **Parâmetro de rota** com código SAP: `decodeParam()` de `src/lib/format.ts`.
- **Comentários `ponytail:`** marcam simplificações deliberadas e seu limite (ex.: 500 grupos, 100 notas por cliente).

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| Build: "… outside of `<Suspense>`" | Componente lê `cookies()`/`searchParams`/`usePathname` fora de Suspense. Envolva em `<Suspense>` com fallback estático. |
| `SAP_SL_URL não configurada` | Falta variável no `.env.local`. |
| Página com "Não foi possível carregar" | Erro do SL (mensagem exibida). Confira mock/SL rodando e credenciais. |
| `self-signed certificate` | `SAP_SL_INSECURE_TLS=true` (dev) ou instalar o certificado. |
| Login não persiste em produção | Servido sem HTTPS; cookie `secure`. |
| Tema não muda | Tema é aplicado no build: `npm run build` de novo. |
| `SESSION_SECRET ausente ou curto` | Defina uma chave com ≥ 32 caracteres. |
| `ExperimentalWarning: SQLite` | Esperado no Node 22 (`node:sqlite`). |
| Busca não acha nada no SAP antigo | SL v1 pode não ter `contains()`; usa `substringof`. |
