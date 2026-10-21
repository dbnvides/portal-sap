# Portal SAP

Portal web para gestão de **itens, parceiros de negócio, vendas e recebimentos** sobre o **SAP Business One Service Layer**. Login próprio (SQLite), sidebar com menus por área e tema de cores por cliente.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · SQLite nativo (`node:sqlite`) · SAP B1 Service Layer (OData).

## Início rápido (sem SAP, com mock)

Requisitos: Node.js **22.13+**.

```bash
npm install
cp .env.example .env.local        # preencha SESSION_SECRET e ADMIN_PASSWORD
```

No `.env.local`, aponte para o mock:

```
SAP_SL_URL=http://localhost:50001/b1s/v2
SAP_COMPANY_DB=SBODEMO
SAP_USER=manager
SAP_PASSWORD=x
```

```bash
npm run mock:sl     # terminal 1
npm run dev         # terminal 2 → http://localhost:3000
```

Entre com `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env.local`.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` | ESLint |
| `npm run mock:sl` | Mock do Service Layer na porta 50001 |
| `npm run e2e` | Testes ponta a ponta (Playwright) |

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/arquitetura.md](docs/arquitetura.md) | Visão geral, estrutura de pastas, fluxo de requisição, autenticação, cliente do Service Layer, segurança |
| [docs/modulos.md](docs/modulos.md) | Cada tela: rotas, entidades SAP, ações e regras de negócio |
| [docs/configuracao.md](docs/configuracao.md) | Variáveis de ambiente, temas por cliente, deploy em produção |
| [docs/desenvolvimento.md](docs/desenvolvimento.md) | Rodar local, mock, testes, criar módulo novo, convenções, problemas comuns |
| [PLAN.md](PLAN.md) | Plano de desenvolvimento e decisões |

## Para agentes (Claude Code)

Comece pela skill `portal` (orquestrador) — ela indica os guias em `.claude/skills/portal/modulos/`. Catálogo e fluxo de exemplo: skill `portal-guia`. Regras do projeto: `CLAUDE.md` / `AGENTS.md`.
