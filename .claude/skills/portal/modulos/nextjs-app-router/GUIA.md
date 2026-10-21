---
name: nextjs-app-router
description: Next.js 16 App Router conventions for this portal — folders, layouts, Server/Client Components, data fetching, Server Actions, forms, error/loading files, env vars, CSS. Use before creating any page, route, component, action or form.
---

# Next.js App Router — regras do portal

Fonte: docs oficiais do Next 16 em `references/` (origem: `node_modules/next/dist/docs/`).

## Estrutura

```
src/
  app/
    (auth)/login/page.tsx        # rota pública
    (portal)/layout.tsx          # sidebar + header
    (portal)/<modulo>/page.tsx   # lista
    (portal)/<modulo>/[id]/page.tsx
    (portal)/<modulo>/actions.ts # Server Actions do módulo
  components/                    # UI compartilhada
  lib/                           # dal, session, service-layer (server-only)
  styles/themes.css              # temas por cliente
proxy.ts
```

Route groups `(auth)` / `(portal)` separam layouts sem afetar URL.

## Regras

1. **Server Component por padrão.** `'use client'` só onde há estado/eventos (sidebar toggle, form com `useActionState`). Empurre `'use client'` para folhas.
2. **Fetch no servidor.** Pages chamam funções do DAL direto (`await getItems()`), sem route handler intermediário.
3. **Mutations = Server Actions** em `actions.ts` com `'use server'`. Após mutar: `revalidatePath()` e/ou `redirect()`.
4. **Forms:** `<form action={action}>` + `useActionState` para erros/pending. Validar no servidor sempre.
5. **`params` e `searchParams` são Promises:** `const { id } = await params`.
6. **`loading.tsx` em toda rota** reexportando um skeleton de `src/components/skeletons.tsx`. `error.tsx` único em `(portal)` (Client Component).
7. **Env vars:** servidor lê `process.env.X`; `NEXT_PUBLIC_` só para valores não secretos.
8. **Navegação:** `next/link`; item ativo da sidebar via `usePathname()`.
9. **Estilo:** Tailwind v4 com tokens do style guide (`bg-primary`, `text-muted`...). Nunca cor hex em componente. Ver `../style-guide/GUIA.md`.
10. **Sem lib nova sem motivo.** Primeiro: Next/React/Tailwind/plataforma.

## Referências

`references/02-project-structure.md`, `03-layouts-and-pages.md`, `06-fetching-data.md`, `07-mutating-data.md`, `10-error-handling.md`, `forms.md`, `server-actions.md`, `environment-variables.md`, `11-css.md`.
