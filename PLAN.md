# Plano de desenvolvimento — Portal SAP

Stack: Next.js 16.4 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · SAP B1 Service Layer.
Deps: `jose` (sessão JWT), `server-only`, `zod`, `undici` (TLS do SL), `lucide-react` (ícones). Banco do portal: SQLite nativo (`node:sqlite`), senha com `scrypt` (stdlib).

## Fase 0 — Fundação ✅
- [x] Projeto criado (`create-next-app`), `AGENTS.md` do Next mantido
- [x] Skills: `nextjs-app-router`, `nextjs-auth` (docs oficiais copiadas em `references/`), `sap-service-layer`, `style-guide`
- [x] Style guide com tema por cliente (`src/styles/themes.css` + `CLIENT_THEME`)
- [x] `.env.example`

## Fase 1 — Autenticação e proteção ✅
- `src/lib/db.ts` / `users.ts` — SQLite, tabela `users`, admin inicial via `.env`
- `src/lib/session.ts` — cookie JWT assinado (jose), 8h, httpOnly
- `src/lib/dal.ts` — `getUser()` / `requireAdmin()`
- `src/lib/service-layer.ts` — `sl<T>()`, `slPage<T>()`, usuário técnico SAP, relogin em 401, erro normalizado, TLS dev
- `proxy.ts` — checagem otimista: sem sessão ⇒ `/login`; logado em `/login` ⇒ `/`
- `(auth)/login` — form e-mail/senha, `useActionState`, `?next=` seguro
- Logout (Server Action)

## Fase 2 — Layout do portal ✅
- `(portal)/layout.tsx` — sidebar + header, tema/logo do cliente
- Sidebar com grupos colapsáveis, item ativo, responsiva (drawer no mobile)
- Header: nome do usuário/empresa (Server Component em `<Suspense>`), sair
- Componentes base: `DataTable` (tabela + paginação via `searchParams`), `SearchBar`, `StatusBadge`, `PageHeader`, `loading.tsx`/`error.tsx`

## Execução
Fases 3–5 em paralelo por 4 agents (Itens · Parceiros+Usuários · Vendas · Financeiro+Dashboard); 5º agent testa com mock do Service Layer.

## Fase 3 — Cadastros
| Menu | Rotas | SL |
|---|---|---|
| Dashboard | `/` | contagens + últimos documentos |
| Itens | `/itens`, `/itens/[code]`, `/itens/novo` | `Items`, `ItemGroups`, `Warehouses` (estoque por depósito) |
| Parceiros de negócio | `/parceiros`, `/parceiros/[code]`, `/parceiros/novo` | `BusinessPartners` (filtro Cliente/Fornecedor/Lead) |
| Usuários (admin) | `/admin/usuarios` | SQLite |

## Fase 4 — Vendas
| Menu | Rotas | SL |
|---|---|---|
| Cotações | `/vendas/cotacoes` | `Quotations` |
| Pedidos de venda | `/vendas/pedidos`, `/[id]`, `/novo` | `Orders` (criar, fechar, cancelar) |
| Entregas | `/vendas/entregas` | `DeliveryNotes` (gerar a partir de pedido) |
| Notas fiscais de saída | `/vendas/notas` | `Invoices` |
| Devoluções | `/vendas/devolucoes` | `Returns`, `CreditNotes` |

Form de documento compartilhado: cabeçalho (PN, datas) + linhas (item, qtd, preço, depósito), cópia de documento base (`BaseType/BaseEntry/BaseLine`).

## Fase 5 — Financeiro (recebimento)
| Menu | Rotas | SL |
|---|---|---|
| Contas a receber | `/financeiro/receber` | `Invoices` em aberto (`DocumentStatus eq 'bost_Open'`) |
| Recebimentos | `/financeiro/recebimentos`, `/novo` | `IncomingPayments` (baixa de notas) |

## Fase 6 — Fechamento
- [x] Auditoria de segurança das Server Actions (agent de testes)
- [x] `/code-review`: 10 achados corrigidos, regressões no E2E (84/84)
- [x] `npm run build` + lint limpos, E2E 84/84
- [x] README + `docs/` (arquitetura, módulos, configuração, desenvolvimento)
- [x] Skills organizadas: `portal` (orquestrador) + `portal-guia` (catálogo)

## Fora do escopo agora (adicionar quando pedirem)
- Compras / estoque (transferências, inventário), relatórios, permissões por perfil além do SAP, multi-empresa na mesma instância, dark mode, i18n.

## Decisões
- **Login no SQLite.** Usuários do portal (admin/user) no banco local; SAP acessado por um usuário técnico (`SAP_USER`).
- **Sem API intermediária.** Server Components/Actions chamam o SL direto via DAL.
- **Tema por deploy** (`CLIENT_THEME`). Se precisar tema por subdomínio no mesmo deploy, ler host no layout.
