---
name: sap-service-layer
description: How this portal talks to SAP Business One — reads (GET) via SQL query/procedure on the company DB, writes (POST/PATCH/Close/Cancel) via Service Layer. Use before writing any code that reads or writes SAP data (Items, BusinessPartners, Orders, Invoices, IncomingPayments...).
---

# SAP B1 — regras do portal

## Padrão obrigatório: leitura por SQL, escrita por Service Layer

| Operação | Caminho |
|---|---|
| **Leitura** (lista, detalhe, combo/select, dashboard, busca, totais) | Query ou procedure direto no banco da empresa (`src/lib/sql.ts`) |
| **Escrita** (criar, alterar, fechar, cancelar, qualquer ação de negócio) | Service Layer (`src/lib/service-layer.ts`) |

Por quê: SQL lê rápido, faz join/agregação/paginação que o OData não faz bem, e não consome sessão do SL. Escrita pelo SL passa pelas regras de negócio, validações e numeração do SAP.

- **Nunca** `INSERT`/`UPDATE`/`DELETE` em tabela do SAP por SQL. Quebra suporte SAP e pula regras de negócio. Gravou → SL.
- **Nunca** GET no SL para alimentar tela. Exceção única: ler a resposta do próprio POST/PATCH (ex.: `DocEntry` criado).
- Depois de gravar pelo SL, recarregar a tela pela leitura SQL (`redirect` para o detalhe).

## Leitura — SQL

- Banco: SQL Server, driver `mssql`. Um pool único em `src/lib/sql.ts` (`server-only`, exporta `sqlPool()`), reaproveitado entre hot reloads (mesmo padrão `globalThis` de `src/lib/db.ts`). Não criar conexão por módulo.
- `.env`: `SAP_DB_SERVER`, `SAP_DB_USER`, `SAP_DB_PASSWORD` (banco = `SAP_COMPANY_DB`). Só servidor.
- Usuário de banco **só leitura**: `db_datareader` + `EXECUTE` nas procedures do portal. Nunca `sa`/`manager`.
- **Sempre parametrizado** (`request.input('nome', valor)` → `@nome`). Nunca concatenar valor de usuário no SQL. Nome de coluna/ordenação vindo da tela: whitelist.
- Query simples (lista/detalhe de uma entidade): SQL inline na função de `src/lib/sap/<modulo>.ts`.
- Lógica pesada ou reaproveitada (join de várias tabelas, saldo, aging, dashboard): procedure `PORTAL_<Modulo>_<Acao>` executada com `request.execute(...)`. Script da procedure versionado em `sql/` no repo (`create or alter procedure`).
- Paginação: `ORDER BY ... OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY` + `COUNT(*) OVER() AS Total` na mesma query. Retorno no mesmo formato `{ rows, total, page, pageSize }` que as telas já usam.
- Só colunas usadas na tela (nada de `SELECT *`). Aliases com os nomes do DTO (`T0."ItemCode"`), para a tela não mudar.
- Detalhe não encontrado: função devolve `null` → página chama `notFound()`.

## Escrita — Service Layer

- Base: `SAP_SL_URL` (ex.: `https://servidor:50000/b1s/v1`). Só servidor.
- Login: `POST /Login` `{ CompanyDB, UserName, Password }` → cookies `B1SESSION` e `ROUTEID`, `SessionTimeout` (min). Logout: `POST /Logout`.
- Login do portal é no SQLite. SL usa **usuário técnico** do `.env` (`SAP_USER`/`SAP_PASSWORD`/`SAP_COMPANY_DB`); sessão SL em memória do servidor, relogin automático em 401.
- Certificado self-signed: `SAP_SL_INSECURE_TLS=true` só em dev, via `undici` Agent no client. Nunca `NODE_TLS_REJECT_UNAUTHORIZED=0` global.
- Cliente único `src/lib/service-layer.ts` (`server-only`): `sl<T>(path, {method, body, headers})`, `key(v)`, `SlError`. `sl()` já exige usuário logado. Não criar client por entidade.
- Documentos: `DocEntry` = chave, `DocNum` = número exibido. Fechar: `POST /Orders(<DocEntry>)/Close`. Cancelar: `/Cancel`.
- Erro: `{ error: { code, message: { value } } }` (v1) ou `{ error: { code, message } }` (v2). `sl()` normaliza e lança `SlError`; Server Action devolve a mensagem ao form.

## Entidades por módulo

| Módulo | Leitura (tabelas) | Escrita (entidade SL) |
|---|---|---|
| Itens | `OITM`, `OITB`, `OWHS`, `OITW` | `Items` |
| Parceiros | `OCRD`, `CRD1`, `OCPR` | `BusinessPartners` |
| Cotações | `OQUT`/`QUT1` | `Quotations` |
| Pedidos de venda | `ORDR`/`RDR1` | `Orders` |
| Entregas | `ODLN`/`DLN1` | `DeliveryNotes` |
| Notas de saída | `OINV`/`INV1` | `Invoices` |
| Contas a receber | `OINV`, `JDT1` (saldo em aberto) | — |
| Recebimentos | `ORCT`/`RCT2` | `IncomingPayments` |
| Devoluções | `ORDN`/`RDN1`, `ORIN`/`RIN1` | `Returns`, `CreditNotes` |

## Situação atual do código

Leituras em `src/lib/sap/*.ts` ainda usam `slPage`/`slFind` (OData). Ao mexer num módulo, migrar a leitura dele para SQL. Módulo novo já nasce no padrão.
