# Módulos

Convenções comuns a todas as telas:
- **Lista:** busca `?q=`, filtros específicos, paginação `?page=` (20 por página).
- **Detalhe:** registro inexistente → página 404.
- **Form:** erros de validação ou do SAP aparecem no topo do form, mantendo o que foi digitado.
- **Status de documento:** Aberto (`bost_Open`), Fechado (`bost_Close`), Cancelado (`Cancelled = tYES`).

Menu definido em `src/components/menu.ts`.

---

## Dashboard — `/`

Arquivo: `src/app/(portal)/page.tsx` · Dados: `src/lib/sap/finance.ts`

| Card / tabela | Origem |
|---|---|
| Pedidos de venda abertos | `GET /Orders/$count` (abertos, não cancelados) |
| Notas a receber + saldo | `GET /Invoices/$count` + `$apply=aggregate(DocTotal, PaidToDate)` |
| Notas vencidas | `GET /Invoices/$count` com `DocDueDate lt hoje` |
| Clientes ativos | `GET /BusinessPartners/$count` (`cCustomer`, `Valid=tYES`, `Frozen=tNO`) |
| Últimos pedidos (5) | `GET /Orders` ordem `DocEntry desc` |
| Próximos vencimentos (5) | `GET /Invoices` abertas, `DocDueDate ge hoje` |

Cada card carrega em paralelo no próprio `<Suspense>`. Se o SAP falhar num card, só ele mostra erro.

---

## Itens — `/itens`

Arquivos: `src/app/(portal)/itens/` · Dados: `src/lib/sap/items.ts` · Entidades: `Items`, `ItemGroups`

| Rota | Função |
|---|---|
| `/itens` | Lista: código, descrição, grupo, estoque (`QuantityOnStock`), status. Busca em código/descrição; filtro `?grupo=` |
| `/itens/[code]` | Detalhe + estoque por depósito (`ItemWarehouseInfoCollection`: em estoque, comprometido, pedido, disponível) |
| `/itens/novo` | Criar: código, descrição, grupo (obrigatório), item de venda/compra/estoque, código de barras, unidade de venda |
| `/itens/[code]/editar` | Editar os mesmos campos (código fixo) |

Ações: `createItemAction` → `POST /Items`; `updateItemAction` → `PATCH /Items('<code>')`.
Status: `Frozen=tYES` → Bloqueado · `Valid=tNO` → Inativo · senão Ativo.
Não exibido: preço (falta definir qual lista de preço usar).

---

## Parceiros de negócio — `/parceiros`

Arquivos: `src/app/(portal)/parceiros/` · Dados: `src/lib/sap/business-partners.ts` · Entidades: `BusinessPartners`, `BusinessPartnerGroups`

| Rota | Função |
|---|---|
| `/parceiros` | Lista: código, nome, tipo, CNPJ/CPF, telefone, e-mail, saldo. Filtro `?tipo=cCustomer|cSupplier|cLid` |
| `/parceiros/[code]` | Detalhe + endereços (`BPAddresses`) + contatos (`ContactEmployees`) |
| `/parceiros/novo` | Criar: código, nome, tipo, CNPJ/CPF, telefone, e-mail, grupo (opcional) |
| `/parceiros/[code]/editar` | Editar (código fixo) |

Ações: `createPartnerAction` → `POST /BusinessPartners`; `updatePartnerAction` → `PATCH /BusinessPartners('<code>')`.
A confirmar: CNPJ/CPF gravado em `FederalTaxID`; na localização Brasil pode ser `BPFiscalTaxIDCollection`.

---

## Vendas — `/vendas/[tipo]`

Arquivos: `src/app/(portal)/vendas/` · Dados: `src/lib/sap/sales-documents.ts`

Uma implementação genérica para os 5 documentos, configurada em `salesTypes`:

| `tipo` | Menu | Entidade SL | ObjType | Pode gerar |
|---|---|---|---|---|
| `cotacoes` | Cotações | `Quotations` | 23 | pedido |
| `pedidos` | Pedidos de venda | `Orders` | 17 | entrega, nota |
| `entregas` | Entregas | `DeliveryNotes` | 15 | nota, devolução |
| `notas` | Notas fiscais de saída | `Invoices` | 13 | — |
| `devolucoes` | Devoluções | `Returns` | 16 | — |

| Rota | Função |
|---|---|
| `/vendas/[tipo]` | Lista: nº, cliente, data, vencimento, total, status. Busca por cliente ou nº (se numérico); `?status=aberto|fechado` |
| `/vendas/[tipo]/[docEntry]` | Detalhe: cabeçalho, linhas, totais. Botões (só documento aberto): **Gerar …**, **Fechar**, **Cancelar** (com confirmação) |
| `/vendas/[tipo]/novo` | Form: cliente (busca com sugestões), datas, observação, linhas (item, qtd, preço, depósito), total sem impostos |
| `/vendas/[tipo]/novo?base=<tipo>&baseEntry=<n>` | Gerar a partir de outro documento: copia cliente e linhas abertas (qtd = `RemainingOpenQuantity`) com `BaseType/BaseEntry/BaseLine` |

Ações (`vendas/[tipo]/actions.ts`): `saveDocument` → `POST /<Entidade>` (valida que o cliente existe e é `cCustomer`), `documentOp` → `POST /<Entidade>(n)/Close|Cancel`, `lookup` → sugestões de clientes/itens.
Limitações: preço não é preenchido automaticamente; depósito é texto livre; total oficial (com impostos) é o `DocTotal` do SAP.
Tipo inválido na URL → 404.

---

## Financeiro

Dados: `src/lib/sap/finance.ts`

### Contas a receber — `/financeiro/receber`

Notas de saída abertas e não canceladas: nº, cliente, emissão, vencimento, total, pago (`PaidToDate`), saldo, badge **Vencida**. Filtros: `?q=` cliente, `?situacao=vencidas|a-vencer`. Totalizador do saldo da página. Botão **Receber** → novo recebimento com cliente e nota pré-selecionados.

### Recebimentos — `/financeiro/recebimentos`

| Rota | Função |
|---|---|
| `/financeiro/recebimentos` | Lista `IncomingPayments`: nº, cliente, data, total, forma, status |
| `/financeiro/recebimentos/[docEntry]` | Detalhe + notas baixadas (`PaymentInvoices`) + **Cancelar** |
| `/financeiro/recebimentos/novo?cliente=<CardCode>&nota=<DocEntry>` | Escolher cliente → notas abertas dele → marcar notas e valor aplicado → forma (Transferência ou Dinheiro) e conta contábil → salvar. Valor do pagamento = soma aplicada (só leitura; o servidor recalcula). |

Ações: `createPaymentAction` → `POST /IncomingPayments`; `cancelPaymentAction` → `POST /IncomingPayments(n)/Cancel`.
Validação no servidor (em centavos): valor aplicado > 0; sem nota repetida; nota é do cliente, está aberta e o valor aplicado ≤ saldo (consulta com `$top` = nº de notas, funciona com mais de 20).
Contas padrão: `SAP_TRANSFER_ACCOUNT`, `SAP_CASH_ACCOUNT` (editáveis no form).
Limitações: cheque/cartão não suportados (aparecem como "Outros"); até 100 notas por cliente; detalhe mostra `DocEntry` da nota baixada (não o `DocNum`).

---

## Administração — `/admin/usuarios` (só admin)

Arquivos: `src/app/(portal)/admin/usuarios/` · Dados: SQLite (`src/lib/users.ts`)

| Rota | Função |
|---|---|
| `/admin/usuarios` | Lista: nome, e-mail, perfil, ativo, criado em |
| `/admin/usuarios/novo` | Criar: nome, e-mail, senha (mín. 8), perfil |
| `/admin/usuarios/[id]/editar` | Editar nome, perfil, ativo, nova senha (opcional). E-mail não muda |

Regras: page e todas as actions com `requireAdmin()`; admin não pode se desativar nem se rebaixar; e-mail duplicado → "Já existe um usuário com este e-mail."; menu "Administração" só aparece para admin.
