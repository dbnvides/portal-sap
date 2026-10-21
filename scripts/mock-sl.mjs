// Mock do SAP B1 Service Layer (v2) em memória, para desenvolver e testar sem SAP.
// Uso: npm run mock:sl  →  SAP_SL_URL=http://localhost:50001/b1s/v2 (qualquer CompanyDB/usuário/senha).
// ponytail: só o subconjunto de OData que o portal usa; dados somem ao reiniciar.
import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_SL_PORT ?? 50001);
const BASE = "/b1s/v2";

// ---------- Seed ----------
const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const db = {
  ItemGroups: [
    { Number: 100, GroupName: "Itens" },
    { Number: 101, GroupName: "Matéria-prima" },
    { Number: 102, GroupName: "Revenda" },
    { Number: 103, GroupName: "Embalagens" },
  ],
  BusinessPartnerGroups: [
    { Code: 100, Name: "Clientes" },
    { Code: 101, Name: "Fornecedores" },
    { Code: 102, Name: "Distribuidores" },
  ],
  Items: [],
  BusinessPartners: [],
  Quotations: [], Orders: [], DeliveryNotes: [], Invoices: [], Returns: [],
  IncomingPayments: [],
};
const keys = { Items: "ItemCode", BusinessPartners: "CardCode", ItemGroups: "Number", BusinessPartnerGroups: "Code" };
const DOCS = ["Quotations", "Orders", "DeliveryNotes", "Invoices", "Returns"];
const OBJ_TYPE = { 23: "Quotations", 17: "Orders", 15: "DeliveryNotes", 13: "Invoices", 16: "Returns" };
for (const e of [...DOCS, "IncomingPayments"]) keys[e] = "DocEntry";

const products = [
  ["Parafuso sextavado M8", 100, 12.5], ["Porca M8 zincada", 100, 0.9], ["Arruela lisa 8mm", 100, 0.35],
  ["Chapa de aço 2mm", 101, 189.9], ["Tubo galvanizado 1\"", 101, 74], ["Tinta epóxi cinza 3,6L", 102, 219],
  ["Luva de vaqueta", 102, 18.7], ["Fita isolante 20m", 102, 7.4], ["Caixa de papelão 40x30", 103, 4.2],
  ["Filme stretch 500mm", 103, 39.9], ["Disco de corte 7\"", 102, 9.8], ["Eletrodo 6013 2,5mm", 101, 42],
  ["Rebite pop 4x12", 100, 0.18], ["Broca HSS 8mm", 102, 15.6], ["Cantoneira 1/8 x 1\"", 101, 58.3],
  ["Graxa multiuso 1kg", 102, 31], ["Lixa ferro 120", 102, 2.1], ["Pallet PBR", 103, 65],
  ["Abraçadeira nylon 200mm", 100, 0.25], ["Óleo de corte 5L", 101, 98], ["Mangueira PU 8mm", 102, 6.9],
  ["Chave combinada 13mm", 102, 27.5], ["Selante PU 400g", 102, 24.9], ["Etiqueta adesiva 100x50", 103, 0.08],
  ["Bucha nylon S8", 100, 0.22],
];
products.forEach(([name, group, price], i) => {
  const code = `A${String(i + 1).padStart(4, "0")}`;
  const wh = [
    { WarehouseCode: "01", InStock: (i * 37) % 500, Committed: (i * 7) % 40, Ordered: (i * 11) % 60 },
    { WarehouseCode: "02", InStock: (i * 13) % 120, Committed: 0, Ordered: 0 },
  ];
  db.Items.push({
    ItemCode: code, ItemName: name, ItemsGroupCode: group, Valid: i % 9 === 8 ? "tNO" : "tYES", Frozen: i === 6 ? "tYES" : "tNO",
    SalesItem: "tYES", PurchaseItem: "tYES", InventoryItem: group === 102 && i % 4 === 0 ? "tNO" : "tYES",
    BarCode: `789${String(1000000000 + i * 7919).slice(0, 10)}`, SalesUnit: "UN", Price: price,
    QuantityOnStock: wh.reduce((s, w) => s + w.InStock, 0), ItemWarehouseInfoCollection: wh,
  });
});

const cities = [["São Paulo", "SP"], ["Campinas", "SP"], ["Curitiba", "PR"], ["Belo Horizonte", "MG"], ["Porto Alegre", "RS"], ["Goiânia", "GO"]];
const partners = [
  ["C00001", "Metalúrgica Paulista Ltda", "cCustomer"], ["C00002", "Construtora Horizonte S.A.", "cCustomer"],
  ["C00003", "Agropecuária Vale Verde", "cCustomer"], ["C00004", "Ferragens Silva & Filhos", "cCustomer"],
  ["C00005", "Indústria Moveleira Sul", "cCustomer"], ["C00006", "Auto Peças Rodovia", "cCustomer"],
  ["C00007", "Distribuidora Central Ltda", "cCustomer"], ["C00008", "Oficina do João ME", "cCustomer"],
  ["C00009", "Serralheria Aço Forte", "cCustomer"], ["C00010", "Cooperativa Agrícola Cerrado", "cCustomer"],
  ["C00011", "Hospital Santa Luzia", "cCustomer"], ["C00012", "Prefeitura de Itapira", "cCustomer"],
  ["C00013", "Transportadora Expresso Sul", "cCustomer"], ["C00014", "Padaria Pão Dourado", "cCustomer"],
  ["C00015", "D'Ávila Comércio de Ferro", "cCustomer"], ["C00016", "Supermercado Bom Preço", "cCustomer"],
  ["F00001", "Aços Brasil Distribuidora", "cSupplier"], ["F00002", "Tintas Cor & Arte", "cSupplier"],
  ["F00003", "Embalagens Rio Claro", "cSupplier"], ["F00004", "Fixadores Nacional", "cSupplier"],
  ["F00005", "Química Industrial Paraná", "cSupplier"],
  ["L00001", "Marcenaria Nova Era", "cLid"], ["L00002", "Usinagem Precisão", "cLid"], ["L00003", "Granja São Bento", "cLid"],
];
partners.forEach(([code, name, type], i) => {
  const [City, State] = cities[i % cities.length];
  db.BusinessPartners.push({
    CardCode: code, CardName: name, CardType: type, GroupCode: type === "cSupplier" ? 101 : 100,
    FederalTaxID: `${String(10 + i).padStart(2, "0")}.${String(100 + i * 3).slice(0, 3)}.${String(200 + i * 7).slice(0, 3)}/0001-${String(10 + i).slice(-2)}`,
    Phone1: `(11) 3${String(1000000 + i * 4111).slice(0, 3)}-${String(1000 + i * 37).slice(0, 4)}`,
    EmailAddress: i % 5 === 4 ? null : `contato@${name.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 12)}.com.br`,
    CurrentAccountBalance: 0, Valid: "tYES", Frozen: code === "C00014" ? "tYES" : "tNO",
    BPAddresses: [
      { AddressName: "Cobrança", AddressType: "bo_BillTo", Street: "Rua das Indústrias", StreetNo: String(100 + i * 10), Block: "Distrito Industrial", City, State, ZipCode: `13${String(100 + i)}-000`, Country: "BR" },
      ...(i % 2 ? [] : [{ AddressName: "Entrega", AddressType: "bo_ShipTo", Street: "Av. Brasil", StreetNo: String(2000 + i), Block: "Centro", City, State, ZipCode: `13${String(200 + i)}-000`, Country: "BR" }]),
    ],
    ContactEmployees: i % 3 ? [{ InternalCode: i + 1, Name: ["Maria Souza", "Carlos Lima", "Ana Pereira"][i % 3], Position: "Compras", Phone1: "(11) 3000-0000", MobilePhone: "(11) 99999-0000", E_Mail: "compras@exemplo.com.br" }] : [],
  });
});

const seq = {};
const nextNum = (e) => (seq[e] = (seq[e] ?? 0) + 1);
const round2 = (v) => Math.round(v * 100) / 100;

/** Cria documento de marketing aplicando as mesmas regras do POST. */
function makeDocument(entity, body) {
  const bp = db.BusinessPartners.find((b) => b.CardCode === body.CardCode);
  if (!bp) throw slErr(400, -10, `Invalid BP code: ${body.CardCode}`);
  if (!Array.isArray(body.DocumentLines) || !body.DocumentLines.length) throw slErr(400, -5002, "To generate this document, first define the numbering series in the Administration module");
  const lines = body.DocumentLines.map((l, i) => {
    const item = db.Items.find((it) => it.ItemCode === l.ItemCode);
    if (!item) throw slErr(400, -10, `Invalid item code: '${l.ItemCode}'`);
    const Quantity = Number(l.Quantity), UnitPrice = Number(l.UnitPrice ?? item.Price);
    if (!(Quantity > 0)) throw slErr(400, -10, `Quantity must be greater than zero (line ${i + 1})`);
    if (l.BaseEntry != null) {
      const baseEntity = OBJ_TYPE[l.BaseType];
      const base = baseEntity && db[baseEntity].find((d) => d.DocEntry === Number(l.BaseEntry));
      const bl = base?.DocumentLines.find((x) => x.LineNum === Number(l.BaseLine));
      if (!bl || base.DocumentStatus !== "bost_Open" || bl.LineStatus !== "bost_Open") throw slErr(400, -5002, "Target document line is already closed or does not exist");
      if (base.CardCode !== body.CardCode) throw slErr(400, -10, "Business partner differs from base document");
    }
    return {
      LineNum: i, ItemCode: item.ItemCode, ItemDescription: item.ItemName, Quantity, RemainingOpenQuantity: Quantity,
      UnitPrice, WarehouseCode: l.WarehouseCode || "01", LineTotal: round2(Quantity * UnitPrice), LineStatus: "bost_Open",
      BaseType: l.BaseType ?? -1, BaseEntry: l.BaseEntry ?? null, BaseLine: l.BaseLine ?? null,
    };
  });
  // Baixa a quantidade em aberto do documento base; fecha linha/documento quando zerar.
  for (const l of lines.filter((x) => x.BaseEntry != null)) {
    const base = db[OBJ_TYPE[l.BaseType]].find((d) => d.DocEntry === l.BaseEntry);
    const bl = base.DocumentLines.find((x) => x.LineNum === l.BaseLine);
    bl.RemainingOpenQuantity = Math.max(0, bl.RemainingOpenQuantity - l.Quantity);
    if (bl.RemainingOpenQuantity === 0) bl.LineStatus = "bost_Close";
    if (base.DocumentLines.every((x) => x.LineStatus === "bost_Close")) base.DocumentStatus = "bost_Close";
  }
  const DocEntry = nextNum(entity);
  const doc = {
    DocEntry, DocNum: DocEntry + 1000, CardCode: bp.CardCode, CardName: bp.CardName,
    DocDate: body.DocDate ?? day(0), DocDueDate: body.DocDueDate ?? body.DocDate ?? day(0),
    DocTotal: round2(lines.reduce((s, l) => s + l.LineTotal, 0)), PaidToDate: 0,
    DocumentStatus: "bost_Open", Cancelled: "tNO", Comments: body.Comments ?? null, DocumentLines: lines,
  };
  db[entity].push(doc);
  if (entity === "Invoices") bp.CurrentAccountBalance = round2(bp.CurrentAccountBalance + doc.DocTotal);
  return doc;
}

function makePayment(body) {
  const bp = db.BusinessPartners.find((b) => b.CardCode === body.CardCode);
  if (!bp) throw slErr(400, -10, `Invalid BP code: ${body.CardCode}`);
  const pis = body.PaymentInvoices ?? [];
  const total = round2(Number(body.CashSum ?? 0) + Number(body.TransferSum ?? 0));
  if (round2(pis.reduce((s, p) => s + Number(p.SumApplied), 0)) > total) throw slErr(400, -10, "Total applied exceeds payment amount");
  for (const p of pis) {
    const inv = db.Invoices.find((d) => d.DocEntry === Number(p.DocEntry));
    if (!inv || inv.CardCode !== bp.CardCode || inv.DocumentStatus !== "bost_Open") throw slErr(400, -10, `Invoice ${p.DocEntry} is closed or belongs to another BP`);
    if (round2(inv.PaidToDate + Number(p.SumApplied)) > inv.DocTotal) throw slErr(400, -10, `Amount exceeds balance of invoice ${p.DocEntry}`);
  }
  for (const p of pis) applyToInvoice(p.DocEntry, Number(p.SumApplied), bp);
  const DocEntry = nextNum("IncomingPayments");
  const doc = {
    DocEntry, DocNum: DocEntry + 5000, CardCode: bp.CardCode, CardName: bp.CardName, DocDate: body.DocDate ?? day(0),
    CashSum: Number(body.CashSum ?? 0), CashAccount: body.CashAccount ?? null,
    TransferSum: Number(body.TransferSum ?? 0), TransferAccount: body.TransferAccount ?? null, TransferDate: body.TransferDate ?? null,
    Remarks: body.Remarks ?? null, Cancelled: "tNO",
    PaymentInvoices: pis.map((p, i) => ({ LineNum: i, DocEntry: Number(p.DocEntry), SumApplied: Number(p.SumApplied), InvoiceType: p.InvoiceType ?? "it_Invoice" })),
  };
  db.IncomingPayments.push(doc);
  return doc;
}

function applyToInvoice(docEntry, amount, bp) {
  const inv = db.Invoices.find((d) => d.DocEntry === Number(docEntry));
  inv.PaidToDate = round2(inv.PaidToDate + amount);
  inv.DocumentStatus = inv.PaidToDate >= inv.DocTotal ? "bost_Close" : "bost_Open";
  bp.CurrentAccountBalance = round2(bp.CurrentAccountBalance - amount);
}

// Documentos de exemplo
const L = (code, q, p) => ({ ItemCode: code, Quantity: q, UnitPrice: p });
[
  ["Quotations", "C00001", -12, [L("A0001", 100, 12.5), L("A0002", 100, 0.9)]],
  ["Quotations", "C00005", -3, [L("A0006", 4, 219)]],
  ["Orders", "C00001", -10, [L("A0001", 200, 12.5), L("A0003", 500, 0.35)]],
  ["Orders", "C00002", -6, [L("A0004", 10, 189.9), L("A0005", 20, 74)]],
  ["Orders", "C00003", -2, [L("A0016", 12, 31)]],
  ["Orders", "C00007", -1, [L("A0011", 50, 9.8), L("A0014", 10, 15.6)]],
  ["DeliveryNotes", "C00002", -5, [L("A0004", 5, 189.9)]],
  ["Invoices", "C00001", -40, [L("A0001", 80, 12.5)]],
  ["Invoices", "C00001", -20, [L("A0006", 2, 219)]],
  ["Invoices", "C00002", -35, [L("A0004", 5, 189.9)]],
  ["Invoices", "C00003", -5, [L("A0016", 20, 31)]],
  ["Invoices", "C00004", -3, [L("A0022", 6, 27.5), L("A0023", 10, 24.9)]],
  ["Invoices", "C00006", -1, [L("A0020", 3, 98)]],
  ["Invoices", "C00015", -15, [L("A0015", 8, 58.3)]],
  ["Returns", "C00001", -8, [L("A0001", 5, 12.5)]],
].forEach(([e, card, offset, lines]) => {
  const d = makeDocument(e, { CardCode: card, DocDate: day(offset), DocDueDate: day(offset + 30), DocumentLines: lines });
  if (e === "Orders" && card === "C00007") d.Comments = "Entregar no período da manhã";
});
// Cliente com 22 notas em aberto (> página padrão de 20 do SL), vencendo depois de todo o resto do seed.
for (let i = 0; i < 22; i++) {
  makeDocument("Invoices", { CardCode: "C00012", DocDate: day(-1), DocDueDate: day(60 + i), DocumentLines: [L("A0002", 10, 1)] });
}
makePayment({ CardCode: "C00001", DocDate: day(-10), TransferSum: 600, TransferAccount: "1.1.1.02", TransferDate: day(-10), PaymentInvoices: [{ DocEntry: 1, SumApplied: 600 }] });
makePayment({ CardCode: "C00002", DocDate: day(-4), CashSum: 949.5, CashAccount: "1.1.1.01", PaymentInvoices: [{ DocEntry: 3, SumApplied: 949.5 }] });

// ---------- OData: $filter ----------
function tokenize(s) {
  const re = /\s*(?:('(?:[^']|'')*')|(-?\d+(?:\.\d+)?)(?![\w])|([A-Za-z_][\w/]*)|(\(|\)|,))/y;
  const out = [];
  let m;
  re.lastIndex = 0;
  while (re.lastIndex < s.length) {
    if (/^\s*$/.test(s.slice(re.lastIndex))) break;
    if (!(m = re.exec(s))) throw slErr(400, -1, `Invalid $filter near: ${s.slice(re.lastIndex, re.lastIndex + 20)}`);
    if (m[1] !== undefined) out.push({ t: "str", v: m[1].slice(1, -1).replace(/''/g, "'") });
    else if (m[2] !== undefined) out.push({ t: "num", v: Number(m[2]) });
    else if (m[3] !== undefined) out.push({ t: "id", v: m[3] });
    else out.push({ t: m[4] });
  }
  return out;
}

const CMP = { eq: (a, b) => a === b, ne: (a, b) => a !== b, lt: (a, b) => a < b, le: (a, b) => a <= b, gt: (a, b) => a > b, ge: (a, b) => a >= b };
const FN = {
  contains: (a, b) => String(a ?? "").toLowerCase().includes(String(b).toLowerCase()),
  startswith: (a, b) => String(a ?? "").toLowerCase().startsWith(String(b).toLowerCase()),
  endswith: (a, b) => String(a ?? "").toLowerCase().endsWith(String(b).toLowerCase()),
};

/** Compila `$filter` em predicado. Gramática: or > and > not > (expr) | fn(a,b) | a op b. */
export function compileFilter(src) {
  if (!src) return () => true;
  const tk = tokenize(src);
  let i = 0;
  const peek = (v) => tk[i] && (tk[i].t === v || (tk[i].t === "id" && tk[i].v === v));
  const expect = (t) => { if (!peek(t)) throw slErr(400, -1, `Invalid $filter: expected '${t}'`); i++; };
  const operand = () => {
    const x = tk[i++];
    if (!x) throw slErr(400, -1, "Invalid $filter: unexpected end");
    if (x.t === "str" || x.t === "num") return () => x.v;
    if (x.t === "id" && (x.v === "true" || x.v === "false")) return () => x.v === "true";
    if (x.t === "id" && x.v === "null") return () => null;
    if (x.t === "id") return (row) => row[x.v];
    throw slErr(400, -1, "Invalid $filter operand");
  };
  const primary = () => {
    if (peek("(")) { i++; const e = or(); expect(")"); return e; }
    if (tk[i]?.t === "id" && FN[tk[i].v] && tk[i + 1]?.t === "(") {
      const fn = FN[tk[i].v]; i += 2;
      const a = operand(); expect(","); const b = operand(); expect(")");
      return (row) => fn(a(row), b(row));
    }
    const a = operand();
    const op = tk[i++];
    if (!op || op.t !== "id" || !CMP[op.v]) throw slErr(400, -1, "Invalid $filter: expected comparison operator");
    const b = operand();
    return (row) => CMP[op.v](a(row), b(row));
  };
  const not = () => (peek("not") ? (i++, ((e) => (row) => !e(row))(not())) : primary());
  const and = () => { let e = not(); while (peek("and")) { i++; const l = e, r = not(); e = (row) => l(row) && r(row); } return e; };
  const or = () => { let e = and(); while (peek("or")) { i++; const l = e, r = and(); e = (row) => l(row) || r(row); } return e; };
  const e = or();
  if (i < tk.length) throw slErr(400, -1, "Invalid $filter: trailing tokens");
  return e;
}

// ---------- HTTP ----------
function slErr(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

const sessions = new Set();
const routeId = ".node1";

function send(res, status, body, headers = {}) {
  if (body === undefined) { res.writeHead(status, headers); return res.end(); }
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": typeof body === "string" ? "text/plain" : "application/json;odata.metadata=minimal;charset=utf-8", ...headers });
  res.end(text);
}

function parseKey(raw) {
  return /^'.*'$/s.test(raw) ? raw.slice(1, -1).replace(/''/g, "'") : Number(raw);
}

function select(row, fields) {
  if (!fields) return structuredClone(row);
  return Object.fromEntries(fields.split(",").map((f) => f.trim()).filter((f) => f in row).map((f) => [f, structuredClone(row[f])]));
}

function sortBy(rows, orderby) {
  if (!orderby) return rows;
  const specs = orderby.split(",").map((s) => { const [f, dir] = s.trim().split(/\s+/); return { f, desc: dir?.toLowerCase() === "desc" }; });
  return [...rows].sort((a, b) => {
    for (const { f, desc } of specs) {
      const x = a[f] ?? "", y = b[f] ?? "";
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR");
      if (c) return desc ? -c : c;
    }
    return 0;
  });
}

function aggregate(rows, apply) {
  const m = /^filter\((.*)\)\/aggregate\((.*)\)$/s.exec(apply) ?? /^()aggregate\((.*)\)$/s.exec(apply);
  if (!m) throw slErr(400, -1, "Unsupported $apply");
  const pred = compileFilter(m[1]);
  const filtered = rows.filter(pred);
  const out = {};
  for (const part of m[2].split(",")) {
    const a = /^\s*(\w+)\s+with\s+(sum|max|min|average)\s+as\s+(\w+)\s*$/.exec(part);
    if (!a) throw slErr(400, -1, `Unsupported aggregate: ${part}`);
    const vals = filtered.map((r) => Number(r[a[1]] ?? 0));
    out[a[3]] = !vals.length ? null
      : a[2] === "sum" ? round2(vals.reduce((s, v) => s + v, 0))
      : a[2] === "max" ? Math.max(...vals) : a[2] === "min" ? Math.min(...vals) : vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  return { value: [out] };
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw slErr(400, -1, "Invalid JSON body"); }
}

function create(entity, body) {
  if (DOCS.includes(entity)) return makeDocument(entity, body);
  if (entity === "IncomingPayments") return makePayment(body);
  const k = keys[entity];
  if (!body[k] && body[k] !== 0) throw slErr(400, -10, `Field '${k}' is required`);
  if (db[entity].some((r) => r[k] === body[k])) throw slErr(400, -2035, `This entry already exists in the following tables (ODBC -2035)`);
  const defaults = {
    Items: { QuantityOnStock: 0, Valid: "tYES", Frozen: "tNO", Price: 0, ItemWarehouseInfoCollection: [{ WarehouseCode: "01", InStock: 0, Committed: 0, Ordered: 0 }] },
    BusinessPartners: { CurrentAccountBalance: 0, Valid: "tYES", Frozen: "tNO", GroupCode: 100, BPAddresses: [], ContactEmployees: [], FederalTaxID: null, Phone1: null, EmailAddress: null },
  }[entity] ?? {};
  const row = { ...defaults, ...body };
  db[entity].push(row);
  return row;
}

function action(entity, row, op) {
  if (entity === "IncomingPayments" && op === "Cancel") {
    if (row.Cancelled === "tYES") throw slErr(400, -10, "Document is already cancelled");
    const bp = db.BusinessPartners.find((b) => b.CardCode === row.CardCode);
    for (const p of row.PaymentInvoices) applyToInvoice(p.DocEntry, -p.SumApplied, bp);
    row.Cancelled = "tYES";
    return;
  }
  if (!DOCS.includes(entity) || !["Close", "Cancel"].includes(op)) throw slErr(400, -1, `Action ${op} not supported on ${entity}`);
  if (row.DocumentStatus !== "bost_Open" || row.Cancelled === "tYES") throw slErr(400, -5002, "Document is already closed or cancelled");
  if (op === "Cancel" && row.DocumentLines.some((l) => l.RemainingOpenQuantity < l.Quantity)) throw slErr(400, -5002, "Cannot cancel a document that has target documents");
  if (op === "Cancel" && row.PaidToDate > 0) throw slErr(400, -5002, "Cannot cancel an invoice with payments");
  row.DocumentStatus = "bost_Close";
  for (const l of row.DocumentLines) l.LineStatus = "bost_Close";
  if (op === "Cancel") row.Cancelled = "tYES";
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith(BASE)) throw slErr(404, -1, "Not found");
  const path = decodeURIComponent(url.pathname.slice(BASE.length));
  // Parse estrito: `+` NÃO vira espaço (o SL real pode tratar `+` como literal). Cliente deve mandar `%20`.
  const q = new URLSearchParams();
  for (const kv of url.search.slice(1).split("&").filter(Boolean)) {
    const i = kv.indexOf("=");
    q.append(decodeURIComponent(i < 0 ? kv : kv.slice(0, i)), i < 0 ? "" : decodeURIComponent(kv.slice(i + 1)));
  }

  if (path === "/Login" && req.method === "POST") {
    const b = await readBody(req);
    if (!b.CompanyDB || !b.UserName || !b.Password) throw slErr(401, 100000027, "Login failed: CompanyDB, UserName and Password required");
    const id = randomUUID();
    sessions.add(id);
    return send(res, 200, { "odata.metadata": `${BASE}/$metadata#B1Sessions/@Element`, SessionId: id, Version: "1000190", SessionTimeout: 30 }, {
      "Set-Cookie": [`B1SESSION=${id}; HttpOnly; path=${BASE}`, `ROUTEID=${routeId}; path=${BASE}`],
    });
  }
  const sid = /(?:^|;\s*)B1SESSION=([^;]+)/.exec(req.headers.cookie ?? "")?.[1];
  if (!sid || !sessions.has(sid)) throw slErr(401, 301, "Invalid session or session already timeout.");
  if (path === "/Logout" && req.method === "POST") { sessions.delete(sid); return send(res, 204); }

  const m = /^\/(\w+)(?:\((.+)\))?(?:\/(\$count|\w+))?$/s.exec(path);
  if (!m || !db[m[1]]) throw slErr(404, -1, `Resource not found for the segment '${path}'`);
  const [, entity, rawKey, sub] = m;
  const table = db[entity];

  if (rawKey !== undefined) {
    const k = parseKey(rawKey);
    const row = table.find((r) => r[keys[entity]] === k);
    if (!row) throw slErr(404, -2028, "No matching records found (ODBC -2028)");
    if (sub && req.method === "POST") { action(entity, row, sub); return send(res, 204); }
    if (sub) throw slErr(400, -1, "Unsupported");
    if (req.method === "GET") return send(res, 200, select(row, q.get("$select")));
    if (req.method === "PATCH") {
      const b = await readBody(req);
      delete b[keys[entity]];
      Object.assign(row, b);
      return send(res, 204);
    }
    throw slErr(405, -1, "Method not allowed");
  }

  if (sub === "$count" && req.method === "GET") return send(res, 200, String(table.filter(compileFilter(q.get("$filter"))).length));
  if (sub) throw slErr(404, -1, "Not found");

  if (req.method === "POST") {
    const row = create(entity, await readBody(req));
    return send(res, 201, structuredClone(row));
  }
  if (req.method !== "GET") throw slErr(405, -1, "Method not allowed");
  if (q.get("$apply")) return send(res, 200, aggregate(table, q.get("$apply")));

  const maxPage = Number(/odata\.maxpagesize=(\d+)/.exec(req.headers.prefer ?? "")?.[1] ?? 20);
  const top = q.has("$top") ? Number(q.get("$top")) : maxPage;
  const skip = Number(q.get("$skip") ?? 0);
  const rows = sortBy(table.filter(compileFilter(q.get("$filter"))), q.get("$orderby"));
  const pageSize = Math.min(top, maxPage);
  const value = rows.slice(skip, skip + pageSize).map((r) => select(r, q.get("$select")));
  const body = { "odata.metadata": `${BASE}/$metadata#${entity}`, value };
  if (skip + pageSize < Math.min(rows.length, skip + top)) {
    const next = new URLSearchParams(q);
    next.set("$skip", String(skip + pageSize));
    next.set("$top", String(top - pageSize));
    body["odata.nextLink"] = `${entity}?${next}`;
  }
  return send(res, 200, body);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    if (!e.status) console.error(e);
    send(res, e.status ?? 500, { error: { code: e.code ?? -1, message: e.message } });
  }).finally(() => {
    if (process.env.MOCK_SL_LOG !== "0") console.log(`${req.method} ${decodeURIComponent(req.url)} → ${res.statusCode}`);
  });
});

// `node scripts/mock-sl.mjs --check`: auto-teste do parser de $filter, sem subir o servidor.
if (process.argv.includes("--check")) {
  const row = { A: "Ferro D'Ávila", N: 5, D: "2026-01-10", S: "bost_Open" };
  const t = (f) => compileFilter(f)(row);
  const assert = (cond, msg) => { if (!cond) { console.error("FALHOU:", msg); process.exit(1); } };
  assert(t("N eq 5 and S eq 'bost_Open'"), "and/eq");
  assert(!t("N ne 5"), "ne");
  assert(t("D lt '2026-02-01' and D ge '2026-01-10'"), "lt/ge datas");
  assert(t("(contains(A,'d''ávila') or N eq 9) and not (N gt 10)"), "contains+aspas+parênteses+not");
  assert(!t("contains(A,'x') or (N lt 5)"), "or falso");
  assert(aggregate([{ DocTotal: 10, P: 1 }, { DocTotal: 5.5, P: 2 }], "filter(P le 1)/aggregate(DocTotal with sum as DocTotal)").value[0].DocTotal === 10, "aggregate");
  console.log("mock-sl: auto-teste ok");
} else {
  server.listen(PORT, () => console.log(`Mock Service Layer em http://localhost:${PORT}${BASE}`));
}
