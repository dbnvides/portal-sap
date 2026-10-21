import "server-only";
import { Agent, fetch } from "undici";
import { getUser } from "./dal";

/**
 * Cliente único do SAP B1 Service Layer. Usuário técnico do .env; acesso ao portal
 * já foi validado no SQLite (getUser) antes de qualquer chamada.
 */

type SlSession = { cookie: string; expiresAt: number };

const g = globalThis as unknown as { slSession?: SlSession | null; slLogin?: Promise<SlSession> };

// ponytail: TLS inseguro só para SL com certificado self-signed em dev; em produção instale o certificado.
const dispatcher = process.env.SAP_SL_INSECURE_TLS === "true" ? new Agent({ connect: { rejectUnauthorized: false } }) : undefined;

function baseUrl() {
  const url = process.env.SAP_SL_URL;
  if (!url) throw new Error("SAP_SL_URL não configurada no .env");
  return url.replace(/\/$/, "");
}

export class SlError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string | number) {
    super(message);
  }
}

async function parseError(res: Awaited<ReturnType<typeof fetch>>) {
  const body = (await res.json().catch(() => null)) as
    | { error?: { code?: string | number; message?: string | { value?: string } } }
    | null;
  const msg = body?.error?.message;
  const text = typeof msg === "string" ? msg : (msg?.value ?? `Service Layer HTTP ${res.status}`);
  return new SlError(text, res.status, body?.error?.code);
}

async function login(): Promise<SlSession> {
  const res = await fetch(`${baseUrl()}/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CompanyDB: process.env.SAP_COMPANY_DB,
      UserName: process.env.SAP_USER,
      Password: process.env.SAP_PASSWORD,
    }),
    dispatcher,
  });
  if (!res.ok) throw await parseError(res);
  const { SessionTimeout } = (await res.json()) as { SessionTimeout: number };
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter((c) => c.startsWith("B1SESSION=") || c.startsWith("ROUTEID="))
    .join("; ");
  // Renova 1 min antes do timeout do SL.
  return { cookie, expiresAt: Date.now() + (SessionTimeout - 1) * 60_000 };
}

async function session(force = false) {
  if (!force && g.slSession && g.slSession.expiresAt > Date.now()) return g.slSession;
  // Requisições simultâneas compartilham o mesmo login.
  g.slLogin ??= login().finally(() => (g.slLogin = undefined));
  g.slSession = await g.slLogin;
  return g.slSession;
}

/**
 * Chamada ao Service Layer. `path` relativo, ex.: `/Items('A001')`, `/Orders?$top=20`.
 * Exige usuário logado no portal. Retorna `undefined` em 204.
 */
export async function sl<T>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  await getUser();
  for (let attempt = 0; ; attempt++) {
    const s = await session(attempt > 0);
    const res = await fetch(`${baseUrl()}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Cookie: s.cookie,
        ...(init.body !== undefined && { "Content-Type": "application/json" }),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      dispatcher,
    });
    if (res.status === 401 && attempt === 0) continue; // sessão SL expirou: relogar uma vez
    if (!res.ok) throw await parseError(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}

/** GET de um registro: `null` quando o SL responde 404 (página chama `notFound()`). */
export async function slFind<T>(path: string): Promise<T | null> {
  try {
    return await sl<T>(path);
  } catch (e) {
    if (e instanceof SlError && e.status === 404) return null;
    throw e;
  }
}

export type PageQuery = {
  select: string[];
  filter?: string;
  orderby?: string;
  page?: number;
  pageSize?: number;
  /** Ex.: `DocumentLines` → `$expand=DocumentLines` */
  expand?: string;
};

/** Lista paginada `{ rows, total }`. Contagem via `/$count` (compatível v1 e v2). */
export async function slPage<T>(entity: string, q: PageQuery) {
  const pageSize = q.pageSize ?? 20;
  const page = Math.max(1, q.page ?? 1);
  const params = odataQuery({
    $select: q.select.join(","), $filter: q.filter, $orderby: q.orderby, $expand: q.expand,
    $top: pageSize, $skip: (page - 1) * pageSize,
  });
  const [list, total] = await Promise.all([
    sl<{ value: T[] }>(`/${entity}?${params}`, { headers: { Prefer: `odata.maxpagesize=${pageSize}` } }),
    sl<number>(`/${entity}/$count?${odataQuery({ $filter: q.filter })}`),
  ]);
  return { rows: list.value, total: Number(total), page, pageSize };
}

/**
 * Query string OData: `odataQuery({ $select: "A,B", $top: 20 })` → `$select=A%2CB&$top=20`.
 * Sempre `encodeURIComponent` (espaço = `%20`). Não use URLSearchParams: ele troca espaço por `+`,
 * que o Service Layer pode ler como `+` literal. Valores `undefined`/vazios são omitidos.
 */
export function odataQuery(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
}

/** Busca textual em vários campos: `(contains(A,'x') or contains(B,'x'))`. */
export function containsAny(fields: string[], q: string) {
  return `(${fields.map((f) => `contains(${f},${odataString(q)})`).join(" or ")})`;
}

/** Escapa texto para literal OData: `'` vira `''`. */
export function odataString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Chave de entidade para o path: número fica cru, texto entre aspas e codificado. `/Items(${key("A001")})` */
export function key(value: string | number) {
  return typeof value === "number" ? String(value) : encodeURIComponent(odataString(value));
}
