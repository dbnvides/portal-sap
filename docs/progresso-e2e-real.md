# Progresso — E2E contra SAP real (interrompido 2026-10-26)

Alvo: `.env` com `SAP_SL_URL=https://devsap10sql:50000/b1s/v1`, `SAP_COMPANY_DB=SBO_HUESKER`.
Agente parado a pedido do usuário no meio da verificação. Relatório final do agente não foi gerado.

## Alterações não commitadas

- `src/lib/db.ts` — correção de concorrência no SQLite durante `next build`/`next start` (vários workers abrem o banco juntos):
  - `pragma busy_timeout = 5000`: espera o lock em vez de falhar com `database is locked`.
  - seed do admin com `insert or ignore`: outro worker pode já ter inserido.
  - Agente confirmou por teste de mutação que, sem a correção, as duas falhas aparecem. Correção está aplicada (diff conferido).
- `scripts/e2e-real.mjs` (novo) — E2E Playwright contra SAP real, descobre dados navegando (sem seed fixo).
  - `node scripts/e2e-real.mjs`: só leitura + fluxos do SQLite.
  - `E2E_WRITE=1 node scripts/e2e-real.mjs`: cria 1 item, 1 PN, 1 doc por tipo de venda e 1 recebimento, prefixo `TESTE-PORTAL`.
- `.env.example` — aparece como **deletado** no git. Não está claro se foi o usuário ou o agente. Conferir; se não for intencional: `git restore .env.example`.

## Não verificado / desconhecido

- Resultado por rota (passou/falhou): não registrado antes da parada.
- Registros criados no SAP: não confirmado. Antes de rodar com `E2E_WRITE=1` de novo, buscar no SBO_HUESKER registros com `TESTE-PORTAL` (OITM.ItemCode, OCRD.CardCode, Comments de ORDR/OINV/etc., ORCT.Comments) para não duplicar.
- TLS (`SAP_SL_INSECURE_TLS=false` com certificado do devsap10sql) e diferenças OData v1 x v2: sem conclusão registrada.

## Para retomar

1. `npm run lint && npx tsc --noEmit && npm run build`
2. `npx next start -p 3100` (com `.env` real)
3. `node scripts/e2e-real.mjs` (leitura); depois `E2E_WRITE=1 node scripts/e2e-real.mjs` se ainda faltar a escrita.
4. Verificar rotas: /login, /, /admin/usuarios (+novo, editar), /itens, /parceiros, /vendas/[tipo], /financeiro/receber, /financeiro/recebimentos (+novo, detalhe).
5. Commit de `src/lib/db.ts` + `scripts/e2e-real.mjs` quando passar.
