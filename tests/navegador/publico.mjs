// Teste de navegador do fluxo público: inscrição online, offline + sincronização, impressão, SW, proxy.
import { chromium } from "playwright";
import fs from "node:fs";

const REF = process.env.SUPABASE_REF || "fcbpcrakjakyagcvbxqq";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const DIR = decodeURIComponent(new URL("./capturas/", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
fs.mkdirSync(DIR, { recursive: true });
const T = process.env.SUPABASE_ACCESS_TOKEN;
if (!T) { console.error("Defina SUPABASE_ACCESS_TOKEN (token pessoal do Supabase) para verificar e limpar o banco."); process.exit(2); }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return r.json();
}

const resultados = [];
function ok(nome, cond, extra = "") {
  resultados.push({ nome, ok: !!cond, extra });
  console.log(`${cond ? "PASS" : "FAIL"} ${nome} ${extra}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 420, height: 860 }, locale: "pt-BR", isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errosConsole = [];
page.on("console", (m) => { if (m.type() === "error") errosConsole.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => errosConsole.push("PAGEERROR " + String(e).slice(0, 200)));

// 1) Página pública carrega
await page.goto(`${BASE}/inscricao`, { waitUntil: "networkidle" });
ok("inscricao carrega", await page.locator("h1").first().textContent() === "Garanta seu acesso ao evento");
await page.screenshot({ path: `${DIR}/shot-01-form.png`, fullPage: true });

// 2) Validação em português
await page.getByRole("button", { name: "Confirmar inscrição" }).click();
ok("validação nome", await page.getByText("Informe seu nome completo").isVisible());
ok("validação telefone", await page.getByText("Informe um telefone válido").isVisible());

// 3) Inscrição online
const nome = `Teste Online ${Date.now().toString(36).toUpperCase()}`;
await page.fill("#f-nome", nome);
await page.fill("#f-telefone", "61999887766");
ok("máscara telefone", (await page.inputValue("#f-telefone")) === "(61) 99988-7766", await page.inputValue("#f-telefone"));
await page.selectOption("#f-profissao", "Eletricista");
await page.fill("#f-email", "teste.online@exemplo.com");
await page.getByRole("button", { name: "Confirmar inscrição" }).click();
await page.waitForSelector("#comprovante", { timeout: 20000 });
const codigo = (await page.locator("#comprovante").getByText(/^WL-[0-9A-Z]{6}$/).first().textContent())?.trim();
ok("código gerado", /^WL-[0-9A-Z]{6}$/.test(codigo || ""), codigo);
ok("credencial com QR", (await page.locator("svg[title], section[aria-label='Credencial digital'] svg").count()) > 0);
await page.screenshot({ path: `${DIR}/shot-02-credencial.png`, fullPage: true });
await page.waitForTimeout(1500);
const linha = await sql(`select codigo, nome, presente, origem from public.inscritos where codigo = '${codigo}'`);
ok("linha no Supabase (online)", Array.isArray(linha) && linha.length === 1 && linha[0].nome === nome && linha[0].origem === "online", JSON.stringify(linha));

// 4) Impressão: só o comprovante visível
await page.emulateMedia({ media: "print" });
const visCred = await page.locator("section[aria-label='Credencial digital']").evaluate((el) => getComputedStyle(el).display);
const visComp = await page.locator("#comprovante").evaluate((el) => getComputedStyle(el).display);
const visHeader = await page.locator("header").evaluate((el) => getComputedStyle(el).display);
ok("impressão esconde credencial e cabeçalho", visCred === "none" && visHeader === "none", `${visCred}/${visHeader}`);
ok("impressão mostra comprovante", visComp !== "none", visComp);
await page.screenshot({ path: `${DIR}/shot-03-print.png`, fullPage: true });
await page.emulateMedia({ media: "screen" });

// 5) Service worker registrado
await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller !== null || false, null, { timeout: 15000 }).catch(() => {});
await page.reload({ waitUntil: "networkidle" });
const swAtivo = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && (r.active)); });
ok("service worker ativo", swAtivo);

// 6) Inscrição offline
await page.getByRole("button", { name: "Fazer outra inscrição" }).click().catch(() => {});
await ctx.setOffline(true);
await page.waitForTimeout(500);
const nomeOff = `Teste Offline ${Date.now().toString(36).toUpperCase()}`;
await page.fill("#f-nome", nomeOff);
await page.fill("#f-telefone", "61988776655");
await page.selectOption("#f-profissao", "Arquiteto(a)");
await page.fill("#f-email", "teste.offline@exemplo.com");
await page.getByRole("button", { name: "Confirmar inscrição" }).click();
await page.waitForSelector("#comprovante", { timeout: 20000 });
const codigoOff = (await page.locator("#comprovante").getByText(/^WL-[0-9A-Z]{6}$/).first().textContent())?.trim();
ok("credencial gerada offline", /^WL-[0-9A-Z]{6}$/.test(codigoOff || ""), codigoOff);
ok("banner pendente", await page.getByText("será confirmada automaticamente").isVisible());
ok("status mostra pendente", /pendente/i.test(await page.locator("header button").first().textContent()));
await page.screenshot({ path: `${DIR}/shot-04-offline.png`, fullPage: true });
const antes = await sql(`select count(*)::int as n from public.inscritos where codigo = '${codigoOff}'`);
ok("ainda não está no banco", antes[0]?.n === 0, JSON.stringify(antes));

// 7) Volta a rede → sincroniza sozinho
await ctx.setOffline(false);
await page.waitForSelector("text=Conexão restabelecida", { timeout: 40000 }).then(() => ok("banner confirmada", true)).catch(() => ok("banner confirmada", false));
await page.waitForTimeout(1500);
const depois = await sql(`select count(*)::int as n from public.inscritos where codigo = '${codigoOff}'`);
ok("sincronizou sem duplicar", depois[0]?.n === 1, JSON.stringify(depois));
ok("status volta a Online", /online/i.test(await page.locator("header button").first().textContent()));

// 8) Página offline abre pelo SW (recarregar sem rede)
await ctx.setOffline(true);
const resp = await page.goto(`${BASE}/inscricao`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);
ok("recarrega offline via SW", !!resp && (await page.locator("h1").first().textContent().catch(() => "")) === "Garanta seu acesso ao evento", resp ? String(resp.status()) : "sem resposta");
await ctx.setOffline(false);

// 9) /gestao redireciona para login
await page.goto(`${BASE}/gestao`, { waitUntil: "networkidle" });
ok("gestao redireciona p/ login", page.url().includes("/gestao/login"), page.url());
await page.screenshot({ path: `${DIR}/shot-05-login.png`, fullPage: true });

// 10) limpeza dos registros de teste
await sql(`delete from public.inscritos where email in ('teste.online@exemplo.com','teste.offline@exemplo.com')`);

console.log("\nerros de console:", errosConsole.length ? errosConsole : "nenhum");
console.log(`\n${resultados.filter((r) => r.ok).length}/${resultados.length} passaram`);
await browser.close();
