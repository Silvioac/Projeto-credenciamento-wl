// Teste de carga: mede o sistema com a base cheia (1000 a 1500 participantes).
//
//   SUPABASE_ACCESS_TOKEN=sbp_... EMAIL=... SENHA=... \
//     [BASE_URL=https://credenciamento-wl.vercel.app] node tests/carga/medir-desempenho.mjs
//
// Salva os arquivos exportados em tests/carga/saida/ para conferência manual.
import { chromium } from "playwright";
import fs from "node:fs";

const REF = process.env.SUPABASE_REF || "fcbpcrakjakyagcvbxqq";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const { EMAIL, SENHA } = process.env;
const T = process.env.SUPABASE_ACCESS_TOKEN;
if (!T || !EMAIL || !SENHA) { console.error("Defina SUPABASE_ACCESS_TOKEN, EMAIL e SENHA."); process.exit(2); }

const SAIDA = decodeURIComponent(new URL("./saida/", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
fs.mkdirSync(SAIDA, { recursive: true });

const sql = async (query) =>
  (await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })).json();

const medidas = [];
const medir = (nome, ms, obs = "") => { medidas.push({ nome, ms: Math.round(ms), obs }); console.log(`  ${String(Math.round(ms)).padStart(6)} ms  ${nome} ${obs}`); };
const ok = [];
const checar = (n, c, x = "") => { ok.push(!!c); console.log(`${c ? "PASS" : "FAIL"} ${n} ${x}`); };

const base = (await sql("select count(*)::int as n, count(*) filter (where presente)::int as p from public.inscritos"))[0];
console.log(`Base: ${base.n} inscritos, ${base.p} presentes\n`);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-BR", acceptDownloads: true });
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));

// ---------- login ----------
let t = Date.now();
await p.goto(`${BASE}/gestao/login`, { waitUntil: "networkidle" });
medir("carregar a tela de login", Date.now() - t);
await p.fill("#login-email", EMAIL);
await p.fill("#login-senha", SENHA);
t = Date.now();
await p.click("text=Entrar");
await p.waitForURL(/\/gestao$/, { timeout: 30000 });
medir("login até abrir a gestão", Date.now() - t);

// ---------- carregar a base inteira ----------
t = Date.now();
await p.waitForFunction((n) => {
  const el = [...document.querySelectorAll("span")].find((s) => /na base local/.test(s.textContent || ""));
  if (!el) return false;
  return Number((el.textContent.match(/^(\d+)/) || [])[1] || 0) >= n;
}, base.n, { timeout: 90000 });
medir("baixar e exibir a base completa", Date.now() - t, `(${base.n} registros, 2 páginas de 1000)`);
checar("recepção mostra a base inteira", true);

// ---------- busca ----------
const alvo = (await sql("select nome, codigo from public.inscritos where email like '%@carga.teste' order by random() limit 1"))[0];
const sobrenome = alvo.nome.split(" ").slice(-1)[0];
t = Date.now();
await p.fill("#busca", alvo.nome);
await p.locator("li", { hasText: alvo.codigo }).first().waitFor({ timeout: 20000 });
medir("buscar por nome completo", Date.now() - t);
t = Date.now();
await p.fill("#busca", sobrenome);
await p.waitForTimeout(50);
await p.locator("li").first().waitFor({ timeout: 20000 });
medir("buscar por sobrenome (muitos resultados)", Date.now() - t);
t = Date.now();
await p.fill("#busca", alvo.codigo);
await p.locator("li", { hasText: alvo.codigo }).first().waitFor({ timeout: 20000 });
medir("buscar por código", Date.now() - t);

// ---------- check-in com a base cheia ----------
const naoPresente = (await sql("select codigo, nome from public.inscritos where not presente and email like '%@carga.teste' order by random() limit 1"))[0];
await p.fill("#busca", naoPresente.codigo);
t = Date.now();
await p.press("#busca", "Enter");
await p.waitForSelector("[role=alertdialog]", { timeout: 30000 });
medir("check-in (clique até confirmação na tela)", Date.now() - t);
checar("confirmação traz o nome certo", (await p.locator("[role=alertdialog]").textContent()).includes(naoPresente.nome));
await p.locator("[role=alertdialog]").click();
await p.waitForTimeout(1500);
const conf = await sql(`select presente from public.inscritos where codigo='${naoPresente.codigo}'`);
checar("check-in gravado no banco", conf[0]?.presente === true);

// ---------- painel ----------
t = Date.now();
await p.click("text=Painel");
await p.locator("text=Presentes agora").waitFor({ timeout: 30000 });
await p.waitForFunction(() => {
  const el = [...document.querySelectorAll("div")].find((d) => d.textContent === "Presentes agora");
  return el && Number(el.previousElementSibling?.textContent || 0) > 0;
}, null, { timeout: 30000 });
medir("abrir o painel e calcular métricas", Date.now() - t);
const presentesTela = await p.evaluate(() => {
  const el = [...document.querySelectorAll("div")].find((d) => d.textContent === "Presentes agora");
  return Number(el.previousElementSibling.textContent);
});
const totalTela = await p.evaluate(() => {
  const el = [...document.querySelectorAll("div")].find((d) => d.textContent === "Inscritos no total");
  return Number(el.previousElementSibling.textContent);
});
const real = (await sql("select count(*)::int as n, count(*) filter (where presente)::int as p from public.inscritos"))[0];
checar("painel bate com o banco", totalTela === real.n && presentesTela === real.p, `tela ${totalTela}/${presentesTela} · banco ${real.n}/${real.p}`);
await p.screenshot({ path: `${SAIDA}/painel-carga.png`, fullPage: true });

// ---------- exportações ----------
t = Date.now();
const [csv] = await Promise.all([p.waitForEvent("download", { timeout: 120000 }), p.getByRole("button", { name: /Exportar planilha/ }).click()]);
await csv.saveAs(`${SAIDA}/${csv.suggestedFilename()}`);
medir("exportar CSV", Date.now() - t);
const textoCsv = fs.readFileSync(`${SAIDA}/${csv.suggestedFilename()}`, "utf8");
const linhasCsv = textoCsv.trim().split(/\r\n/);
checar("CSV tem cabeçalho + todas as linhas", linhasCsv.length === real.n + 1, `${linhasCsv.length - 1} linhas`);
checar("CSV sem coluna de ID interno", !/;ID|ID;/.test(linhasCsv[0]), linhasCsv[0].slice(0, 90));
checar("CSV com acentos corretos", /Código;Nome;Telefone;Profissão/.test(linhasCsv[0]));

t = Date.now();
const [pdf] = await Promise.all([p.waitForEvent("download", { timeout: 180000 }), p.getByRole("button", { name: /Exportar relatório/ }).click()]);
await pdf.saveAs(`${SAIDA}/${pdf.suggestedFilename()}`);
medir("exportar PDF", Date.now() - t);
const tamanhoPdf = fs.statSync(`${SAIDA}/${pdf.suggestedFilename()}`).size;
checar("PDF gerado", tamanhoPdf > 20000, `${(tamanhoPdf / 1024 / 1024).toFixed(2)} MB`);

console.log("\n=== RESUMO DAS MEDIÇÕES ===");
for (const m of medidas) console.log(`${String(m.ms).padStart(7)} ms  ${m.nome} ${m.obs}`);
console.log(`\nArquivos salvos em: ${SAIDA}`);
console.log("erros de página:", erros.length ? erros : "nenhum");
console.log(`\n${ok.filter(Boolean).length}/${ok.length} verificações passaram`);
await b.close();
process.exit(ok.every(Boolean) ? 0 : 1);
