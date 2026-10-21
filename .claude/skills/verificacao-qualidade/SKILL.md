---
name: verificacao-qualidade
description: Mandatory test & verification checklist for web apps (Next.js/React, auth, forms, ERP/OData/SAP Service Layer integrations). Use BEFORE declaring any feature, fix or project done, before a PR/commit, when asked to "testar", "validar", "revisar", "verificar", and whenever starting work on an existing project. Lists bug classes found in real reviews, how to detect each (grep/test), how to fix, and the regression-test procedure.
---

# Verificação de qualidade — obrigatória

> Cópia versionada no projeto (para quem clonar o repo). Original: `~/.claude/skills/verificacao-qualidade/`. Achou bug novo? Atualize **as duas**.

Nada é "pronto" sem passar por aqui. Origem: bugs reais achados em code review do Portal SAP (out/2026). Cada item tem **como achar**, **como corrigir** e **teste de regressão**.

## Procedimento (sempre, nesta ordem)

1. **Lint + tipos + build** limpos (`npm run lint`, `npx tsc --noEmit`, `npm run build`). Build pega o que tsc não pega (ex.: Suspense/Cache Components no Next 16).
2. **Rodar a checklist abaixo** contra o diff (ou o projeto todo, se for primeira vez nele). Use os greps.
3. **E2E** contra mock/ambiente de teste com dados recém-semeados. Um caso feliz + um de erro por fluxo.
4. **Todo bug corrigido ganha teste de regressão** com comentário `// Regressão: <o que era>`.
5. **Prova do teste (mutation check):** reverta a correção temporariamente, rode, confirme que o teste **falha**; restaure e confirme que **passa**. Teste que não falha sem a correção não protege nada.
6. **Isolamento:** cada teste começa de estado limpo (ex.: `clearCookies()` antes de login). Falha não pode contaminar o próximo.
7. **Relatório honesto:** o que rodou, o que passou, o que falhou, o que não foi testado e por quê. Nunca dizer que testou o que não executou.

## Checklist — autenticação e sessão

| # | Bug | Como achar | Correção | Teste |
|---|---|---|---|---|
| A1 | **Loop de redirect**: cookie/JWT válido mas usuário desativado/removido → app manda p/ `/login`, proxy/middleware vê sessão válida e manda p/ `/` | Onde o DAL faz `redirect("/login")` sem apagar cookie, e o proxy redireciona logado em `/login` | Apagar o cookie antes do redirect. Server Component não apaga cookie: redirecionar p/ route handler (`/api/sessao/encerrar`) que apaga e manda p/ login | Desativar usuário com sessão aberta em outro contexto → acessar rota protegida → termina em `/login` e cookie some |
| A2 | **Open redirect** no `?next=`/`returnUrl` | `grep -rn "next\|returnUrl\|redirect(" ` em actions de login; regex tipo `/^\/(?!\/)/` | Resolver com `new URL(next, base)` e exigir `url.origin === base`. Regex não basta: `/\host`, `/<TAB>/host`, `/<LF>/host` viram `//host` no navegador | `?next=//evil.com`, `?next=/\evil.com`, `?next=/%09/evil.com` → fica no portal |
| A3 | **Enumeração de usuário por tempo**: e-mail inexistente responde rápido (sem hash) | Login que faz `if (!user \|\| !verify(...))` com curto-circuito | Sempre rodar o hash: `verify(senha, user?.hash ?? DUMMY_HASH)` | (difícil em E2E) revisão de código |
| A4 | **Validação antes de normalizar**: `z.email().trim()` valida antes de aparar | `grep -rn "z.email(.*).trim()"` | `z.string().trim().pipe(z.email())` | Login/cadastro com `"  email@x.com  "` (forçar `type=text` no input p/ o navegador não aparar) |
| A5 | Export auxiliar em arquivo `'use server'` | Funções exportadas em `'use server'` que não são actions | Não exportar helpers de arquivo `'use server'`: todo export vira endpoint público | revisão |
| A6 | Action sem auth / sem validação | Cada `'use server'`: 1ª linha é `getUser()`/`requireAdmin()`? input passa por zod? args de `.bind` validados? | Auth + zod no início de toda action | Usuário sem perfil chamando a rota/ação → barrado |

## Checklist — integração ERP / OData / SAP Service Layer

| # | Bug | Como achar | Correção | Teste |
|---|---|---|---|---|
| B1 | **Paginação implícita**: consulta sem `$top` devolve só a página padrão (SL = 20) | `grep -rn "sl<\|fetch(" ` em consultas de lista/validação sem `$top` | `$top` = quantidade esperada + header `Prefer: odata.maxpagesize=N` | Seed com **> 20** registros p/ um mesmo filtro e operar com todos |
| B2 | **Encoding de query**: `URLSearchParams` troca espaço por `+`; SL pode ler `+` literal; lista e `$count` divergem | `grep -rn "URLSearchParams" ` em código que monta URL de OData | Helper único com `encodeURIComponent` (`%20`) para lista **e** contagem | Mock com parse estrito (`+` literal) + busca com espaço (`?q=Nome%20Composto`) |
| B3 | Literal OData sem escape (`'` no texto) | `grep -rn "contains(\|eq '" ` com interpolação direta | `odataString(v)` (`'` → `''`) sempre; números validados antes | Busca/código com aspas (`D'Ávila`) |
| B4 | Chave de entidade sem encode (`#`, `?`, `%`, espaço) | `/Entity('${code}')` interpolado | `key(v)` com `encodeURIComponent` | Criar/abrir registro com código `"T 01#"` |
| B5 | **Duplicidade burla validação por item** (mesma nota/linha 2x no POST) | Loops que validam item a item sem checar repetição | Rejeitar ids repetidos (ou somar por id) na camada de dados | POST forjado com o mesmo id duas vezes → recusado |
| B6 | Valor total digitado pelo usuário quando é derivável | Campo "valor" + validação "soma deve ser igual" | Calcular no servidor (soma das partes); mostrar só leitura | Alterar partes e enviar → servidor usa a soma |
| B7 | 404 tratado de jeitos diferentes em vários lugares | `grep -rn "status === 404"` | Um helper (`slFind` → `null`); página faz `if (!x) notFound()` | Registro inexistente → 404 |
| B8 | Sessão do serviço expira | — | Relogin automático em 401, uma vez | Reiniciar o mock durante o uso → página carrega |

## Checklist — datas, dados e código

| # | Bug | Como achar | Correção | Teste |
|---|---|---|---|---|
| C1 | **"Hoje" no fuso do servidor** (host UTC vira o dia às 21h BRT) | `grep -rn "toLocaleDateString(\|new Date().toISOString().slice(0, 10)" ` | Um `today()` com `timeZone` explícito (`APP_TIME_ZONE`, padrão `America/Sao_Paulo`) | revisão / teste unitário com relógio fixo |
| C2 | Lógica duplicada (filtros de busca, datas, helpers) | Mesmo trecho em 3+ arquivos | Extrair helper único na camada certa | — |
| C3 | Tipos que "funcionam por acaso" (spread que parece redundante mas sustenta o tipo) | Antes de remover código "sem efeito", rode `tsc` | Tipar direito (genérico) em vez de spread duplicado | `tsc --noEmit` |
| C4 | Fallback de `<Suspense>` interativo (form no fallback perde parâmetros que ainda não chegaram) | Fallback que renderiza o mesmo form/componente interativo | Fallback = skeleton não interativo | E2E que preenche o form logo após o load |

## Mock de serviço externo — regras

- O mock deve ser **tão estrito quanto o serviço real**: página padrão (20), parse de query sem `+`→espaço, 401 sem sessão, 404 com o formato de erro real.
- Seed precisa ter casos de borda: > página padrão, aspas, espaços, caracteres especiais em chaves.
- Dados em memória: reiniciar antes de cada rodada de E2E.

## Ao terminar

Responda com: build/lint, contagem do E2E (`N/N ok`), bugs corrigidos com arquivo:linha, mutation check feito (sim/não, quais), o que ficou sem teste.
