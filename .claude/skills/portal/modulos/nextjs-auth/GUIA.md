---
name: nextjs-auth
description: Next.js 16 authentication/authorization rules for this portal (login, session cookie, proxy.ts, Data Access Layer). Use before touching login, logout, session, proxy.ts, route protection, or any server code that reads user/SAP data.
---

# Next.js Auth — regras do portal

Fonte: docs oficiais do Next 16 copiadas em `references/` (origem: `node_modules/next/dist/docs/`).
Em caso de dúvida, leia a referência — não confie em memória (Next 16 tem breaking changes).

## Regras

1. **Proxy, não middleware.** Next 16 renomeou `middleware.ts` → `proxy.ts` (export `proxy`). Ver `references/16-proxy.md`.
2. **Proxy = checagem otimista apenas.** Só lê/decifra cookie. Nunca chama Service Layer ou DB no proxy (roda em toda rota, inclusive prefetch).
3. **Segurança real no DAL.** `src/lib/dal.ts`: `getUser()` (react `cache`) e `requireAdmin()`. Toda page/action começa com um deles; `sl()` já chama `getUser()`.
4. **Layout não protege.** Layouts não re-renderizam na navegação. Auth check em page, Server Action, Route Handler e DAL — nunca só no layout.
5. **Server Actions são endpoints públicos.** Sempre `getUser()`/`requireAdmin()` + validar input (zod) no início de cada action.
6. **Cookie de sessão:** `httpOnly`, `secure` (em produção), `sameSite: 'lax'`, `path: '/'`, `expires`. Conteúdo cifrado (`jose`, chave `SESSION_SECRET`).
7. **`cookies()` é async:** `const store = await cookies()`.
8. **Segredos nunca no client.** Sem `NEXT_PUBLIC_` em credenciais. Usuários/senhas (scrypt) no SQLite; credencial SAP técnica só no `.env` do servidor.
9. **DTO:** retornar ao client só os campos necessários, nunca o objeto bruto do Service Layer.
10. **Session em shell UI:** user menu em Server Component aninhado dentro de `<Suspense>`, não `await` no topo do layout.
11. **Cache Components ligado:** leitura de `cookies()`/`searchParams` precisa estar dentro de `<Suspense>` (ver `references/authentication-with-cache-components.md`).

## Referências

- `references/authentication.md` — guia completo (forms, sessão stateless, proxy, DAL, DTO)
- `references/data-security.md` — DAL, server-only, taint
- `references/16-proxy.md` — convenção proxy.ts
- `references/cookies.md` — API cookies()
