---
name: sap-service-layer
description: How this portal talks to SAP Business One Service Layer (login, B1SESSION, OData queries, paging, errors). Use before writing any code that reads or writes SAP entities (Items, BusinessPartners, Orders, Invoices, IncomingPayments...).
---

# SAP B1 Service Layer — regras do portal

## Conexão

- Base: `SAP_SL_URL` (ex.: `https://servidor:50000/b1s/v2`). Só servidor.
- Login: `POST /Login` `{ CompanyDB, UserName, Password }` → cookies `B1SESSION` e `ROUTEID`, `SessionTimeout` (min).
- Logout: `POST /Logout`.
- Toda chamada envia `Cookie: B1SESSION=...; ROUTEID=...`.
- Login do portal é no SQLite. SL usa **usuário técnico** do `.env` (`SAP_USER`/`SAP_PASSWORD`/`SAP_COMPANY_DB`); sessão SL em memória do servidor, relogin automático em 401.
- Certificado self-signed: usar `SAP_SL_INSECURE_TLS=true` só em dev, via `undici` Agent no client. Nunca `NODE_TLS_REJECT_UNAUTHORIZED=0` global.

## Cliente

Um único módulo `src/lib/service-layer.ts` (`server-only`): `sl<T>(path, {method, body, headers})`, `slFind<T>(path)` (GET de um registro, `null` em 404), `slPage<T>(entity, {select, filter, orderby, page, pageSize, expand})` → `{rows,total,page,pageSize}`, `odataString(s)`, `key(v)`, `SlError`. `sl()` já exige usuário logado. Não criar client por entidade.

## OData

- `$select` sempre (só campos usados na tela).
- `$filter`, `$orderby`, `$top`/`$skip` para paginação. Header `Prefer: odata.maxpagesize=N`.
- Contagem: `/Items/$count?$filter=...`.
- Escapar aspas simples em filtros de texto (`'` → `''`).

## Entidades por módulo

| Módulo | Entidade SL |
|---|---|
| Itens | `Items`, `ItemGroups`, `Warehouses` |
| Parceiros | `BusinessPartners` |
| Cotações | `Quotations` |
| Pedidos de venda | `Orders` |
| Entregas | `DeliveryNotes` |
| Notas de saída | `Invoices` |
| Recebimentos | `IncomingPayments` |
| Devoluções | `Returns`, `CreditNotes` |

Documentos: `DocEntry` = chave, `DocNum` = número exibido. Fechar: `POST /Orders(<DocEntry>)/Close`. Cancelar: `/Cancel`.

## Erros

Resposta de erro: `{ error: { code, message: { value } } }` (v1) ou `{ error: { code, message } }` (v2). Normalizar no `sl()` e lançar `Error(message)`; Server Action devolve mensagem ao form.
