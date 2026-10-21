---
name: testes
description: How to validate portal changes — lint, build, SL mock, Playwright E2E.
---

# Testes — regras do portal

## Ferramentas

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint (inclui `scripts/*.mjs`) |
| `npm run build` | Build de produção. Pega erros de Cache Components/Suspense que o `tsc` não pega |
| `npx tsc --noEmit` | Tipos (rode `npx next typegen` antes se criou rota nova) |
| `npm run mock:sl` | Mock do Service Layer em `http://localhost:50001/b1s/v2` (dados em memória) |
| `node scripts/mock-sl.mjs --check` | Auto-teste do parser `$filter` do mock |
| `npm run e2e` | Playwright headless contra `E2E_URL` (padrão `http://localhost:3100`) |

## Fluxo E2E

```bash
npm run mock:sl                    # terminal 1 — reinicie antes de cada e2e (o teste altera dados)
npm run build
SAP_SL_URL=http://localhost:50001/b1s/v2 SAP_COMPANY_DB=X SAP_USER=X SAP_PASSWORD=X npx next start -p 3100   # terminal 2
npx playwright install chromium    # uma vez
npm run e2e
```

Env opcionais do e2e: `E2E_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `E2E_THEME`.

## Regras

0. **Antes de dar qualquer tarefa por concluída, carregue a skill `verificacao-qualidade`** (`.claude/skills/verificacao-qualidade/`) e siga o procedimento dela: checklist de bugs conhecidos, regressão para todo bug corrigido e *mutation check* (reverter a correção e ver o teste falhar).
1. Mudou endpoint/campo do SL num módulo → atualize `scripts/mock-sl.mjs` (seed + suporte OData) no mesmo PR.
2. Tela/ação nova → acrescente um `check(...)` em `scripts/e2e.mjs`. Um caso feliz + um caso de erro bastam.
3. Nunca rode dois `next build` ao mesmo tempo na mesma pasta (`.next` compartilhado).
4. Use `SQLITE_PATH` apontando para um arquivo temporário nos testes para não sujar `data/portal.db`.
5. Pare mock e servidor ao terminar.
6. Cada `check` de login começa com `ctx.clearCookies()`: uma falha não pode contaminar o teste seguinte.
7. O mock é estrito como o SL: página padrão 20, `+` na query é literal, 404/401 no formato real. Não "afrouxe" o mock para um teste passar.
