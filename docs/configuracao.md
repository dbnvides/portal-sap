# Configuração e deploy

## Variáveis de ambiente

Arquivo `.env.local` (dev) ou variáveis do servidor (produção). Modelo: `.env.example`.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SESSION_SECRET` | sim | Chave do cookie de sessão, ≥ 32 caracteres. Gere com `openssl rand -base64 32`. Trocar invalida todas as sessões. |
| `ADMIN_EMAIL` | 1º start | E-mail do admin criado quando não há usuários. |
| `ADMIN_PASSWORD` | 1º start | Senha desse admin. Troque depois em Administração → Usuários. |
| `SQLITE_PATH` | não | Caminho do banco. Padrão `data/portal.db`. |
| `CLIENT_THEME` | não | Tema de cores (`default`, `agro`, `industria` ou novo). **Aplicado no build.** |
| `CLIENT_NAME` | não | Nome exibido na sidebar e no login. **Aplicado no build.** |
| `APP_TIME_ZONE` | não | Fuso usado para "hoje" (vencidas, datas padrão). Padrão `America/Sao_Paulo`. |
| `SAP_SL_URL` | sim | Base do Service Layer, ex. `https://servidor:50000/b1s/v2`. |
| `SAP_COMPANY_DB` | sim | Banco da empresa no SAP. |
| `SAP_USER` / `SAP_PASSWORD` | sim | Usuário técnico do SAP usado por todas as chamadas. |
| `SAP_SL_INSECURE_TLS` | não | `true` aceita certificado self-signed do SL. **Só em desenvolvimento.** |
| `SAP_TRANSFER_ACCOUNT` | não | Conta contábil padrão para recebimento por transferência. |
| `SAP_CASH_ACCOUNT` | não | Conta contábil padrão para recebimento em dinheiro. |

## Temas por cliente

1. Em `src/styles/themes.css`, copie um bloco e renomeie:
   ```css
   [data-theme="acme"] {
     --primary: #7c3aed;
     --accent: #f59e0b;
     --sidebar: #1e1b4b;
     --sidebar-foreground: #ddd6fe;
     --sidebar-active: #7c3aed;
   }
   ```
   Só sobrescreva o que muda; o resto vem do `:root`.
2. `CLIENT_THEME=acme` e `CLIENT_NAME=Acme` no ambiente.
3. `npm run build` (o tema é gravado no HTML estático).
4. Contraste `--primary` × `--primary-foreground` ≥ 4.5:1.

Tokens disponíveis: `primary`, `primary-foreground`, `accent`, `background`, `surface`, `foreground`, `muted`, `border`, `sidebar`, `sidebar-foreground`, `sidebar-active`, `sidebar-active-foreground`, `success`, `warning`, `danger`, `radius`.

Um deploy = um cliente. Para vários clientes num deploy só, a escolha do tema precisaria sair do build (ex.: por host), o que hoje não é suportado.

## Deploy em produção

```bash
npm ci
npm run build      # com as variáveis de produção já definidas (tema!)
npm start          # porta 3000; use -p para mudar
```

Checklist:
- [ ] **HTTPS.** Em produção o cookie é `secure`; servido em HTTP (fora de localhost) o login não funciona. Use proxy reverso com TLS (IIS, Nginx) ou ajuste `secure` em `src/lib/session.ts` conscientemente.
- [ ] `SESSION_SECRET` forte e exclusivo do ambiente.
- [ ] Senha do admin inicial trocada.
- [ ] `SAP_SL_INSECURE_TLS=false`; certificado do SL instalado/confiável no servidor.
- [ ] Usuário técnico SAP com permissões mínimas para os módulos usados.
- [ ] Pasta do `SQLITE_PATH` gravável e incluída no backup. **Processo único** (SQLite local; sessão SL em memória do processo).
- [ ] Node.js 22.13+ (`node:sqlite`). O aviso `ExperimentalWarning: SQLite` é esperado.

## Banco SQLite

Tabela `users`:

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | integer PK | |
| `email` | text unique | sem diferenciar maiúsculas |
| `name` | text | |
| `password_hash` | text | `salt:hash` scrypt (hex) |
| `role` | text | `admin` ou `user` |
| `active` | integer | 1/0 |
| `created_at` | text | timestamp |

Criada automaticamente no primeiro acesso. Backup = copiar o arquivo com o servidor parado (ou `sqlite3 portal.db ".backup copia.db"`).
