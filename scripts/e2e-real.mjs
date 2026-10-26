// E2E contra o SAP REAL (sem mock): descobre os dados navegando (sem seed fixo).
// Uso: npm run build && npx next start -p 3100   (com o .env do SAP real)
//      node scripts/e2e-real.mjs                 (só leitura + fluxos do SQLite)
//      E2E_WRITE=1 node scripts/e2e-real.mjs     (cria 1 item, 1 PN, 1 doc por tipo e 1 recebimento, prefixo TESTE-PORTAL)
// ADMIN_EMAIL/ADMIN_PASSWORD vêm do ambiente ou do .env.
import { chromium } from "@playwright/test";

try { process.loadEnvFile(".env"); } catch {}
const BASE = process.env.E2E_URL ?? "http://localhost:3100";
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const WRITE = process.env.E2E_WRITE === "1";
const STAMP = Date.now().toString(36).toUpperCase().slice(-3); // PN aceita 15 chars: "TESTE-PORTAL" + 3
const USER_EMAIL = `teste-portal.${Date.now()}@portal.local`;
const results = [];
const created = [];

async function check(name, fn) {
  try {
    await fn();
    results.push(["ok", name]);
    console.log(`ok    ${name}`);
  } catch (e) {
    results.push(["FALHA", name]);
    console.log(`FALHA ${name}\n      ${e.message.split("\n").slice(0, 3).join("\n      ")}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
const pathOf = () => new URL(page.url()).pathname + new URL(page.url()).search;
const submit = () => page.locator("main form button[type=submit]:visible").last().click();

/** Abre, espera o streaming e confere: 200, sem erro de carga, sem alerta, textos esperados. */
async function visit(path, ...texts) {
  const res = await page.goto(path);
  await page.waitForLoadState("networkidle");
  assert(res.status() === 200, `HTTP ${res.status()} em ${path}`);
  const body = await page.locator("main").evaluate((el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll("select, datalist").forEach((s) => s.remove());
    return c.innerText.replace(/ /g, " ");
  });
  assert(!body.includes("Não foi possível carregar"), `erro em ${path}: ${body.slice(0, 300)}`);
  const alert = page.locator("main [role=alert]");
  assert(!(await alert.count()), `alerta em ${path}: ${await alert.first().innerText().catch(() => "")}`);
  for (const t of texts) {
    if (t.startsWith("!")) assert(!body.includes(t.slice(1)), `"${t.slice(1)}" não devia aparecer em ${path}`);
    else assert(body.includes(t), `"${t}" não encontrado em ${path}`);
  }
  return body;
}

async function login(email, password) {
  await ctx.clearCookies();
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/");
}

/** Lista: carrega com dados, pagina se houver > 1 página, abre o 1º link e busca pelo texto dele. */
async function checkList(path, { search = true } = {}) {
  let first;
  await check(`lista ${path}`, async () => {
    const body = await visit(path, "registro(s)");
    const total = Number(body.match(/(\d+) registro\(s\)/)?.[1]);
    assert(total > 0, `lista vazia em ${path}`);
    const link = page.locator("main table tbody a").first();
    first = { href: await link.getAttribute("href"), text: (await link.innerText()).trim() };
    if (total > 20) await visit(`${path}${path.includes("?") ? "&" : "?"}page=2`, "página 2 de");
  });
  if (!first) return null;
  await check(`detalhe ${first.href} (1º da lista ${path})`, () => visit(first.href));
  if (search) await check(`busca ${path} q=${first.text}`, () => visit(`${path}?q=${encodeURIComponent(first.text)}`, first.text));
  return first;
}

// ---------- Auth ----------
await check("proxy: /itens sem cookie → /login?next=/itens", async () => {
  const r = await fetch(`${BASE}/itens`, { redirect: "manual" });
  const loc = new URL(r.headers.get("location") ?? "", BASE);
  assert(loc.pathname === "/login" && loc.searchParams.get("next") === "/itens", `location ${r.headers.get("location")}`);
});
await check("login → dashboard", () => login(ADMIN.email, ADMIN.password));
await check("dashboard", () => visit("/", "Pedidos de venda abertos", "Notas a receber em aberto", "Clientes ativos"));
await check("sidebar: todos os links abrem", async () => {
  const hrefs = await page.locator("aside a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  assert(hrefs.length >= 10, `só ${hrefs.length} links`);
  for (const h of hrefs) await visit(h);
});

// ---------- Leitura ----------
const item = await checkList("/itens");
const bp = await checkList("/parceiros");
await checkList("/parceiros?tipo=cCustomer", { search: false });
for (const tipo of ["cotacoes", "pedidos", "entregas", "notas", "devolucoes"]) {
  await checkList(`/vendas/${tipo}`);
  await check(`filtro /vendas/${tipo}?status=aberto`, () => visit(`/vendas/${tipo}?status=aberto`, "registro(s)", "!Fechado"));
  await check(`form /vendas/${tipo}/novo`, () => visit(`/vendas/${tipo}/novo`, "Salvar"));
}
await checkList("/financeiro/receber", { search: false });
for (const s of ["vencidas", "a-vencer"]) await check(`filtro /financeiro/receber?situacao=${s}`, () => visit(`/financeiro/receber?situacao=${s}`, "registro(s)"));
await checkList("/financeiro/recebimentos", { search: false });
await check("form /financeiro/recebimentos/novo", () => visit("/financeiro/recebimentos/novo"));
for (const p of ["/itens/novo", "/parceiros/novo", "/admin/usuarios", "/admin/usuarios/novo"]) await check(`form ${p}`, () => visit(p));
if (item) await check(`form ${item.href}/editar`, () => visit(`${item.href}/editar`, "Salvar"));
if (bp) await check(`form ${bp.href}/editar`, () => visit(`${bp.href}/editar`, "Salvar"));
await check("item inexistente → 404", async () => {
  const r = await page.goto("/itens/TESTE-PORTAL-NAO-EXISTE");
  await page.waitForLoadState("networkidle");
  // Com streaming o status pode sair 200 antes do notFound(): confere o texto da página 404.
  assert(r.status() === 404 || (await page.getByText("could not be found").count()), `status ${r.status()}`);
});

// ---------- Escrita no SAP (E2E_WRITE=1) ----------
if (WRITE) {
  const itemCode = `TESTE-PORTAL-${STAMP}`;
  const cardCode = `TESTE-PORTAL${STAMP}`;
  await check(`criar item ${itemCode}`, async () => {
    await page.goto("/itens/novo");
    await page.fill("#ItemCode", itemCode);
    await page.fill("#ItemName", `TESTE-PORTAL item ${STAMP}`);
    await page.locator("input[name=InventoryItem]").uncheck(); // sem estoque: entrega/nota não dependem de saldo
    await submit();
    await page.waitForURL(`**/itens/${itemCode}`, { timeout: 20000 });
    created.push(["Item", itemCode]);
    await visit(`/itens/${itemCode}`, `TESTE-PORTAL item ${STAMP}`);
  });
  await check(`editar item ${itemCode}`, async () => {
    await page.goto(`/itens/${itemCode}/editar`);
    await page.fill("#ItemName", `TESTE-PORTAL item ${STAMP} editado`);
    await submit();
    await page.waitForURL(`**/itens/${itemCode}`, { timeout: 20000 });
    await visit(`/itens/${itemCode}`, "editado");
  });
  await check(`criar PN ${cardCode}`, async () => {
    await page.goto("/parceiros/novo");
    await page.fill("#CardCode", cardCode);
    await page.fill("#CardName", `TESTE-PORTAL cliente ${STAMP}`);
    await submit();
    await page.waitForURL(`**/parceiros/${cardCode}`, { timeout: 20000 });
    created.push(["BusinessPartner", cardCode]);
    await visit(`/parceiros/${cardCode}`, `TESTE-PORTAL cliente ${STAMP}`);
  });
  await check(`editar PN ${cardCode}`, async () => {
    await page.goto(`/parceiros/${cardCode}/editar`);
    await page.fill("#Phone1", "0000-0000");
    await submit();
    await page.waitForURL(`**/parceiros/${cardCode}`, { timeout: 20000 });
    await visit(`/parceiros/${cardCode}`, "0000-0000");
  });
  let invoiceEntry;
  for (const tipo of ["cotacoes", "pedidos", "entregas", "notas", "devolucoes"]) {
    await check(`criar documento ${tipo}`, async () => {
      await page.goto(`/vendas/${tipo}/novo`);
      await page.waitForLoadState("networkidle");
      await page.fill("#CardCode", cardCode);
      await page.fill("#Comments", `TESTE-PORTAL ${STAMP}`);
      await page.getByLabel("Item da linha 1").fill(itemCode);
      await page.getByLabel("Quantidade da linha 1").fill("1");
      await page.getByLabel("Preço da linha 1").fill("0.01");
      await submit();
      await page.waitForURL(new RegExp(`/vendas/${tipo}/\\d+$`), { timeout: 30000 }).catch(async (e) => {
        throw new Error(`${e.message.split("\n")[0]} | alerta: ${await page.locator("main [role=alert]").first().innerText().catch(() => "-")}`);
      });
      const entry = Number(new URL(page.url()).pathname.split("/").pop());
      const body = await visit(pathOf(), "nº", "TESTE-PORTAL");
      created.push([tipo, `DocEntry ${entry} / DocNum ${body.match(/nº (\d+)/)?.[1]}`]);
      if (tipo === "notas") invoiceEntry = entry;
    });
  }
  if (invoiceEntry) {
    await check("criar recebimento da nota TESTE-PORTAL", async () => {
      await page.goto(`/financeiro/recebimentos/novo?cliente=${encodeURIComponent(cardCode)}&nota=${invoiceEntry}`);
      await page.waitForLoadState("networkidle");
      await submit();
      await page.waitForURL(/\/financeiro\/recebimentos\/\d+$/, { timeout: 30000 }).catch(async (e) => {
        throw new Error(`${e.message.split("\n")[0]} | alerta: ${await page.locator("main [role=alert]").first().innerText().catch(() => "-")}`);
      });
      const body = await visit(pathOf(), "Ativo");
      created.push(["IncomingPayment", `DocEntry ${pathOf().split("/").pop()} / ${body.match(/Recebimento (\d+)/)?.[0]}`]);
    });
  }
}

// ---------- Usuários (SQLite), logout, não-admin ----------
await check("criar usuário do portal", async () => {
  await page.goto("/admin/usuarios/novo");
  await page.fill("#name", "TESTE-PORTAL usuário");
  await page.fill("#email", USER_EMAIL);
  await page.fill("#password", "Senha@123");
  await submit();
  await page.waitForURL("**/admin/usuarios");
  await visit("/admin/usuarios", USER_EMAIL);
});
await check("editar usuário abre", async () => {
  await page.locator("tr", { hasText: USER_EMAIL }).locator("a").first().click();
  await page.waitForURL(/\/admin\/usuarios\/\d+\/editar$/);
  await visit(new URL(page.url()).pathname, "Salvar");
});
await check("logout", async () => {
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/login");
  assert(!(await ctx.cookies()).some((c) => c.name === "session"), "cookie session continua");
});
await check("não-admin não acessa /admin/usuarios", async () => {
  await login(USER_EMAIL, "Senha@123");
  assert(!(await page.locator("aside a[href='/admin/usuarios']").count()), "menu admin visível");
  await page.goto("/admin/usuarios");
  await page.waitForLoadState("networkidle");
  assert(!(await page.content()).includes("Usuários do portal"), `lista de usuários visível em ${page.url()}`);
});

await browser.close();
const failed = results.filter((r) => r[0] !== "ok");
if (created.length) console.log("\nCriado no SAP:\n" + created.map((c) => `  ${c.join(": ")}`).join("\n"));
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
