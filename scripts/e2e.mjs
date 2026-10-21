// Teste ponta a ponta contra o mock do SL (dados do seed de scripts/mock-sl.mjs, mock recém-iniciado).
// Uso: npm run mock:sl  +  npm run build && SAP_SL_URL=http://localhost:50001/b1s/v2 SAP_COMPANY_DB=X SAP_USER=X SAP_PASSWORD=X npx next start -p 3100
//      node scripts/e2e.mjs   (E2E_URL, ADMIN_EMAIL, ADMIN_PASSWORD, E2E_THEME opcionais)
import { chromium } from "@playwright/test";

const BASE = process.env.E2E_URL ?? "http://localhost:3100";
const ADMIN = { email: process.env.ADMIN_EMAIL ?? "admin@portal.local", password: process.env.ADMIN_PASSWORD ?? "Admin@123" };
const results = [];
const USER_EMAIL = `joao.${Date.now()}@portal.local`; // único por execução (SQLite persiste)

async function check(name, fn) {
  try {
    await fn();
    results.push(["ok", name]);
    console.log(`ok    ${name}`);
  } catch (e) {
    results.push(["FALHA", name, e.message.split("\n")[0]]);
    console.log(`FALHA ${name}\n      ${e.message.split("\n").slice(0, 3).join("\n      ")}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept()); // confirm() de fechar/cancelar

/** Abre a página, espera o streaming terminar e confere textos. */
async function visit(path, ...texts) {
  const res = await page.goto(path);
  await page.waitForLoadState("networkidle");
  assert(res.status() === 200, `HTTP ${res.status()} em ${path}`);
  // Sem <select>/<datalist>: opções como "Abertos" confundiriam as checagens.
  const body = await page.locator("main").evaluate((el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll("select, datalist").forEach((s) => s.remove());
    return c.innerText.replace(/ /g, " ");
  });
  assert(!body.includes("Não foi possível carregar"), `erro na página ${path}: ${body.slice(0, 200)}`);
  assert(!(await page.locator("main [role=alert]").count()), `alerta na página ${path}: ${body.slice(0, 200)}`);
  for (const t of texts) {
    if (t.startsWith("!")) assert(!body.includes(t.slice(1)), `"${t.slice(1)}" não devia aparecer em ${path}`);
    else assert(body.includes(t), `"${t}" não encontrado em ${path}`);
  }
  return body;
}

async function login(email, password) {
  await ctx.clearCookies(); // cada login começa limpo: falha anterior não contamina o próximo teste
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
}

const submit = () => page.locator("main form button[type=submit]:visible").last().click(); // rotas anteriores ficam ocultas no DOM (Activity);
const pathOf = () => new URL(page.url()).pathname;

// ---------- Proxy ----------
await check("proxy: / sem cookie → /login", async () => {
  const r = await fetch(`${BASE}/`, { redirect: "manual" });
  assert(r.status >= 300 && r.status < 400, `status ${r.status}`);
  assert(new URL(r.headers.get("location"), BASE).pathname === "/login", `location ${r.headers.get("location")}`);
});
await check("proxy: /itens sem cookie → /login?next=/itens", async () => {
  const r = await fetch(`${BASE}/itens`, { redirect: "manual" });
  const loc = new URL(r.headers.get("location") ?? "", BASE);
  assert(loc.pathname === "/login" && loc.searchParams.get("next") === "/itens", `location ${r.headers.get("location")}`);
});

// ---------- Login ----------
await check("login errado mostra erro", async () => {
  await login(ADMIN.email, "senha-errada");
  await page.getByText("E-mail ou senha inválidos").waitFor({ timeout: 5000 });
  assert(pathOf() === "/login", page.url());
});
await check("login com ?next=/parceiros volta para /parceiros", async () => {
  await ctx.clearCookies();
  await page.goto("/login?next=/parceiros");
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", ADMIN.password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/parceiros");
  await ctx.clearCookies();
});
await check("login com ?next=/\\evil.com não sai do portal", async () => {
  await ctx.clearCookies();
  await page.goto("/login?next=" + encodeURIComponent("/\\evil.com"));
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", ADMIN.password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/", { timeout: 5000 });
  assert(new URL(page.url()).host === new URL(BASE).host, page.url());
  await ctx.clearCookies();
});
// Regressão: regex aceitava "/<TAB>/evil.com"; o navegador remove o TAB e vira "//evil.com".
await check("login com ?next=/<TAB>/evil.com não sai do portal", async () => {
  await ctx.clearCookies();
  await page.goto("/login?next=" + encodeURIComponent("/\t/evil.com"));
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", ADMIN.password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/", { timeout: 5000 });
  assert(new URL(page.url()).host === new URL(BASE).host, page.url());
  await ctx.clearCookies();
});
// Regressão: z.email().trim() validava antes de aparar. type=text para o navegador não aparar sozinho.
await check("login com espaços em volta do e-mail", async () => {
  await ctx.clearCookies();
  await page.goto("/login");
  await page.locator("#email").evaluate((el) => el.setAttribute("type", "text"));
  await page.fill("#email", `  ${ADMIN.email}  `);
  await page.fill("#password", ADMIN.password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === "/", { timeout: 5000 });
  await ctx.clearCookies();
});
await check("login certo → dashboard + cookie httpOnly", async () => {
  await login(ADMIN.email, ADMIN.password);
  await page.waitForURL((u) => u.pathname === "/");
  const c = (await ctx.cookies()).find((c) => c.name === "session");
  assert(c && c.httpOnly && c.sameSite === "Lax", `cookie ${JSON.stringify(c)}`);
});
await check("logado em /login → /", async () => {
  await page.goto("/login");
  assert(pathOf() === "/", page.url());
});

// ---------- Páginas ----------
const pages = [
  ["/", "Pedidos de venda abertos", "Clientes ativos", "Últimos pedidos", "Próximos vencimentos", "Metalúrgica Paulista"],
  ["/itens", "A0001", "Parafuso sextavado", "25 registro(s) · página 1 de 2"],
  ["/itens?page=2", "A0021", "!A0001", "página 2 de 2"],
  ["/itens?q=parafuso", "Parafuso sextavado", "!Porca"],
  ["/itens?grupo=103", "Caixa de papelão", "!Parafuso"],
  ["/itens/A0001", "Estoque por depósito", "Parafuso sextavado M8", "Itens"],
  ["/itens/novo", "Novo item"],
  ["/itens/A0001/editar", "Editar item A0001"],
  ["/parceiros", "C00001", "Metalúrgica Paulista", "24 registro(s)"],
  // Regressão: busca com espaço. O mock lê "+" como literal (igual SL estrito); cliente deve mandar %20.
  ["/parceiros?q=Metal%C3%BArgica%20Paulista", "C00001", "1 registro(s)"],
  ["/parceiros?q=D'Ávila", "D'Ávila Comércio", "!Metalúrgica"],
  ["/parceiros?tipo=cSupplier", "F00001", "!C00001"],
  ["/parceiros/C00001", "Endereços", "Rua das Indústrias", "Contatos"],
  ["/parceiros/C00002/editar", "Editar Construtora Horizonte"],
  ["/parceiros/novo", "Novo parceiro de negócio"],
  ["/financeiro/receber", "Contas a receber", "C00001", "!949,50"],
  ["/financeiro/receber?situacao=vencidas", "C00001", "Vencida", "!C00006"],
  ["/financeiro/receber?situacao=a-vencer", "C00006", "!Vencida"],
  ["/financeiro/receber?q=agro", "C00003", "!C00001"],
  ["/financeiro/recebimentos", "Recebimentos", "Transferência", "Dinheiro"],
  ["/financeiro/recebimentos/1", "Recebimento 5001", "Notas baixadas", "600,00"],
  ["/financeiro/recebimentos/novo?cliente=C00001", "1001", "1002", "Registrar recebimento"],
  ["/admin/usuarios", "Usuários do portal", ADMIN.email],
];
const docs = {
  cotacoes: ["Cotação", null], pedidos: ["Pedido de venda", "cotacoes"], entregas: ["Entrega", "pedidos"],
  notas: ["Nota fiscal de saída", "entregas"], devolucoes: ["Devolução", "entregas"],
};
for (const [tipo, [singular, base]] of Object.entries(docs)) {
  pages.push(
    [`/vendas/${tipo}`, "registro(s)"],
    [`/vendas/${tipo}?q=1001`, "1001"], // busca por nº (lista padrão pode não ter o 1001 na página 1)
    [`/vendas/${tipo}?status=aberto`, "Aberto", "!Fechado"],
    [`/vendas/${tipo}/1`, `${singular} nº 1001`, "Total do documento"],
    [`/vendas/${tipo}/novo`, "Salvar"],
    base && [`/vendas/${tipo}/novo?base=${base}&baseEntry=1`, "A partir de"],
  );
}
pages.push(["/vendas/notas?status=fechado", "Fechado", "Construtora Horizonte", "!Aberto"]);
for (const [path, ...texts] of pages.filter(Boolean)) await check(`página ${path}`, () => visit(path, ...texts.filter(Boolean)));

await check("item inexistente → 404", async () => {
  const r = await page.goto("/itens/NAO-EXISTE");
  await page.waitForLoadState("networkidle");
  assert((await page.content()).includes("404") || r.status() === 404, `status ${r.status()}`);
});
await check("tipo de venda inválido → 404", async () => {
  const r = await page.goto("/vendas/xyz");
  await page.waitForLoadState("networkidle");
  assert((await page.content()).includes("404") || r.status() === 404, `status ${r.status()}`);
});

// ---------- Mutations ----------
await check("criar item", async () => {
  await page.goto("/itens/novo");
  await page.fill("#ItemCode", "T 01#");
  await page.fill("#ItemName", "Item de teste E2E");
  await page.selectOption("#ItemsGroupCode", "102");
  await submit();
  await page.waitForURL("**/itens/T%2001%23");
  await page.waitForLoadState("networkidle");
  await visit(page.url().slice(BASE.length), "Item de teste E2E", "Revenda");
});
await check("criar item duplicado mostra erro do SL", async () => {
  await page.goto("/itens/novo");
  await page.fill("#ItemCode", "A0001");
  await page.fill("#ItemName", "Duplicado");
  await page.selectOption("#ItemsGroupCode", "100");
  await submit();
  await page.getByText("already exists").waitFor({ timeout: 5000 });
  assert((await page.inputValue("#ItemName")) === "Duplicado", "form perdeu valores");
});
await check("editar item", async () => {
  await page.goto("/itens/A0002/editar");
  await page.fill("#ItemName", "Porca M8 zincada (editada)");
  await submit();
  await page.waitForURL("**/itens/A0002");
  await visit("/itens/A0002", "Porca M8 zincada (editada)");
});
await check("editar parceiro", async () => {
  await page.goto("/parceiros/C00002/editar");
  await page.fill("#Phone1", "(11) 4000-1234");
  await submit();
  await page.waitForURL("**/parceiros/C00002");
  await visit("/parceiros/C00002", "(11) 4000-1234");
});
await check("criar parceiro com código com aspas/espaço", async () => {
  await page.goto("/parceiros/novo");
  await page.fill("#CardCode", "C'99 X");
  await page.fill("#CardName", "Cliente Teste E2E");
  await page.fill("#EmailAddress", "teste@e2e.com.br");
  await submit();
  await page.waitForURL(/\/parceiros\/C/);
  await page.waitForLoadState("networkidle");
  await visit(new URL(page.url()).pathname, "Cliente Teste E2E", "teste@e2e.com.br");
});

let orderEntry;
await check("criar pedido de venda", async () => {
  await page.goto("/vendas/pedidos/novo");
  await page.fill("#CardCode", "C00004");
  await page.getByLabel("Item da linha 1").fill("A0001");
  await page.getByLabel("Quantidade da linha 1").fill("3");
  await page.getByLabel("Preço da linha 1").fill("10");
  await page.click("text=Adicionar linha");
  await page.getByLabel("Item da linha 2").fill("A0003");
  await page.getByLabel("Quantidade da linha 2").fill("10");
  await page.getByLabel("Preço da linha 2").fill("0.5");
  await submit();
  await page.waitForURL(/\/vendas\/pedidos\/\d+$/);
  orderEntry = Number(pathOf().split("/").pop());
  await visit(pathOf(), "Pedido de venda nº", "Ferragens Silva", "R$ 35,00", "Aberto");
});
await check("pedido com cliente inexistente mostra erro", async () => {
  await page.goto("/vendas/pedidos/novo");
  await page.fill("#CardCode", "ZZZ");
  await page.getByLabel("Item da linha 1").fill("A0001");
  await submit();
  await page.getByText("Cliente ZZZ não encontrado").waitFor({ timeout: 5000 });
});
await check("gerar entrega a partir do pedido (fecha o pedido)", async () => {
  await page.goto(`/vendas/pedidos/${orderEntry}`);
  await page.click("text=Gerar entrega");
  await page.waitForURL(/\/vendas\/entregas\/novo\?base=pedidos/);
  await page.waitForLoadState("networkidle");
  assert((await page.inputValue("#CardCode")) === "C00004", "cliente não copiado");
  assert((await page.getByLabel("Item da linha 2").inputValue()) === "A0003", "linhas não copiadas");
  await submit();
  await page.waitForURL(/\/vendas\/entregas\/\d+$/);
  await visit(pathOf(), "Entrega nº", "R$ 35,00");
  await visit(`/vendas/pedidos/${orderEntry}`, "Fechado", "!Gerar entrega");
});
await check("fechar documento", async () => {
  await page.goto("/vendas/pedidos/2");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.locator("main").getByText("Fechado").first().waitFor({ timeout: 5000 });
  await visit("/vendas/pedidos/2", "Fechado", "!Gerar entrega");
});
await check("cancelar documento", async () => {
  await page.goto("/vendas/cotacoes/2");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.locator("main").getByText("Cancelado").first().waitFor({ timeout: 5000 });
  await visit("/vendas/cotacoes/2", "Cancelado");
});

let paymentEntry;
await check("criar recebimento baixando nota (fecha a nota)", async () => {
  await page.goto("/financeiro/recebimentos/novo?cliente=C00004&nota=5");
  await page.waitForLoadState("networkidle");
  assert(await page.getByLabel("Receber nota 1005").isChecked(), "nota não pré-selecionada");
  await page.fill("#account", "1.1.1.02");
  await submit();
  await page.waitForURL(/\/financeiro\/recebimentos\/\d+$/);
  paymentEntry = Number(pathOf().split("/").pop());
  await visit(pathOf(), "R$ 414,00", "Transferência", "Ativo");
  await visit("/vendas/notas/5", "Fechado");
  await visit("/financeiro/receber?q=C00004", "!C00004 ·");
});
await check("recebimento com valor maior que o saldo é recusado", async () => {
  await page.goto("/financeiro/recebimentos/novo?cliente=C00006&nota=6");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Valor aplicado na nota 1006").evaluate((el) => el.removeAttribute("max"));
  await page.getByLabel("Valor aplicado na nota 1006").fill("999");
  await page.fill("#account", "1.1.1.02");
  await submit();
  await page.getByText("excede o saldo").waitFor({ timeout: 5000 });
});
// Regressão: validação consultava notas sem $top → SL devolvia só 20 e a 21ª era "não está em aberto".
await check("recebimento com 22 notas (acima da página padrão do SL)", async () => {
  await page.goto("/financeiro/recebimentos/novo?cliente=C00012");
  await page.waitForLoadState("networkidle");
  for (const box of await page.locator("main input[type=checkbox][name=invoice]").all()) await box.check();
  assert((await page.locator("main input[name=invoice]:checked").count()) === 22, "esperava 22 notas marcadas");
  await page.fill("#account", "1.1.1.02");
  await submit();
  await page.waitForURL(/\/financeiro\/recebimentos\/\d+$/);
  await visit(pathOf(), "R$ 220,00");
});
// Regressão: mesma nota duas vezes no POST burlava a checagem de saldo por nota.
await check("recebimento com nota repetida (POST forjado) é recusado", async () => {
  await page.goto("/financeiro/recebimentos/novo?cliente=C00006&nota=6");
  await page.waitForLoadState("networkidle");
  await page.locator("main form", { has: page.locator("input[name=invoice]") }).evaluate((form) => {
    const dup = document.createElement("input");
    Object.assign(dup, { type: "hidden", name: "invoice", value: "6" });
    form.appendChild(dup);
  });
  await page.fill("#account", "1.1.1.02");
  await submit();
  await page.getByText("Nota repetida").waitFor({ timeout: 5000 });
});
await check("cancelar recebimento reabre a nota", async () => {
  await page.goto(`/financeiro/recebimentos/${paymentEntry}`);
  await page.getByRole("button", { name: "Cancelar recebimento" }).click();
  await page.locator("main").getByText("Cancelado").first().waitFor({ timeout: 5000 });
  await visit("/vendas/notas/5", "Aberto");
});

await check("criar usuário", async () => {
  await page.goto("/admin/usuarios/novo");
  await page.fill("#name", "João Vendas");
  await page.fill("#email", USER_EMAIL);
  await page.fill("#password", "Senha@123");
  await submit();
  await page.waitForURL("**/admin/usuarios");
  await visit("/admin/usuarios", USER_EMAIL);
});
await check("logout", async () => {
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/login");
  assert(!(await ctx.cookies()).some((c) => c.name === "session"), "cookie session continua");
  await page.goto("/itens");
  assert(pathOf() === "/login", page.url());
});
await check("usuário não-admin não acessa /admin/usuarios", async () => {
  await login(USER_EMAIL, "Senha@123");
  await page.waitForURL((u) => u.pathname === "/");
  await page.waitForLoadState("networkidle");
  assert(!(await page.locator("aside a[href='/admin/usuarios']").count()), "menu admin visível");
  await page.goto("/admin/usuarios");
  await page.waitForLoadState("networkidle");
  assert(pathOf() === "/" || !(await page.content()).includes("Usuários do portal"), `ficou em ${page.url()}`);
  await page.goto("/admin/usuarios/novo");
  await page.waitForLoadState("networkidle");
  assert(!(await page.content()).includes("Novo usuário</h1>"), "form de novo usuário visível");
});

// Regressão: cookie válido + usuário desativado → /login ↔ / em loop (ERR_TOO_MANY_REDIRECTS).
await check("usuário desativado com sessão aberta vai para /login sem loop", async () => {
  const adminCtx = await browser.newContext({ baseURL: BASE });
  const admin = await adminCtx.newPage();
  await admin.goto("/login");
  await admin.fill("#email", ADMIN.email);
  await admin.fill("#password", ADMIN.password);
  await admin.click("button[type=submit]");
  await admin.waitForURL((u) => u.pathname === "/");
  await admin.goto("/admin/usuarios");
  await admin.locator("tr", { hasText: USER_EMAIL }).locator("a").first().click();
  await admin.waitForURL(/\/admin\/usuarios\/\d+\/editar$/);
  await admin.locator("input[name=active]").uncheck();
  await admin.locator("main form button[type=submit]:visible").last().click();
  await admin.waitForURL("**/admin/usuarios");
  await adminCtx.close();

  // `page` ainda está logado como o usuário desativado. O redirect chega no streaming (depois do load).
  await page.goto("/itens");
  await page.waitForURL((u) => u.pathname === "/login", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  assert(pathOf() === "/login", `ficou em ${page.url()}`); // com loop, nunca estabiliza em /login
  assert(!(await ctx.cookies()).some((c) => c.name === "session"), "cookie session não foi apagado");
});

await check(`tema data-theme=${process.env.E2E_THEME ?? "default"}`, async () => {
  const t = await page.locator("html").getAttribute("data-theme");
  assert(t === (process.env.E2E_THEME ?? "default"), `data-theme=${t}`);
});

await browser.close();
const failed = results.filter((r) => r[0] !== "ok");
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
