// Dois aparelhos logados ao mesmo tempo (ex.: tablet da recepção e computador da organização).
// Um check-in feito num deve aparecer no outro sem recarregar, e a segunda tentativa
// precisa dizer "Já registrado" em vez de confirmar de novo.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... EMAIL=... SENHA=... [BASE_URL=https://...] \
//     node tests/navegador/dois-aparelhos.mjs
import { chromium } from "playwright";

const REF = process.env.SUPABASE_REF || "fcbpcrakjakyagcvbxqq";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const { EMAIL, SENHA } = process.env;
const T = process.env.SUPABASE_ACCESS_TOKEN;
if (!T) { console.error("Defina SUPABASE_ACCESS_TOKEN (token pessoal do Supabase)."); process.exit(2); }
if (!EMAIL || !SENHA) { console.error("Defina EMAIL e SENHA de um usuário da equipe."); process.exit(2); }

const sql = async (query) =>
  (await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })).json();

const res = [];
const ok = (n, c, x = "") => { res.push(!!c); console.log(`${c ? "PASS" : "FAIL"} ${n} ${x}`); };

const cod = `WL-D${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
await sql(`insert into public.inscritos (codigo,nome,telefone,profissao,email) values ('${cod}','Dois Aparelhos Teste','(61) 90000-4444','Eletricista','dois.teste@exemplo.com')`);

const b = await chromium.launch();
async function logar(ctx) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/gestao/login`, { waitUntil: "networkidle" });
  await p.fill("#login-email", EMAIL);
  await p.fill("#login-senha", SENHA);
  await p.click("text=Entrar");
  await p.waitForURL(/\/gestao$/, { timeout: 30000 });
  await p.waitForSelector("text=na base local", { timeout: 30000 });
  return p;
}
const pc = await logar(await b.newContext({ viewport: { width: 1100, height: 900 } }));
const cel = await logar(await b.newContext({ viewport: { width: 400, height: 800 }, isMobile: true }));
await pc.waitForTimeout(3000);

await pc.fill("#busca", cod);
ok("computador vê o inscrito", (await pc.locator("li", { hasText: cod }).count()) === 1);

// check-in feito no celular
await cel.fill("#busca", cod);
await cel.press("#busca", "Enter");
await cel.waitForSelector("[role=alertdialog]", { timeout: 15000 });
ok("celular confirma a entrada", /ENTRADA CONFIRMADA/i.test(await cel.locator("[role=alertdialog]").textContent()));
await cel.locator("[role=alertdialog]").click();

// o computador precisa refletir sozinho
const t0 = Date.now();
await pc.locator("li", { hasText: cod }).locator("text=/Presente · \\d\\d:\\d\\d/").waitFor({ timeout: 30000 })
  .then(() => ok("computador atualizou sozinho", true, `${Date.now() - t0} ms`))
  .catch(() => ok("computador atualizou sozinho", false, "não apareceu em 30 s"));

// segunda tentativa não pode confirmar de novo
await pc.fill("#busca", cod);
await pc.press("#busca", "Enter");
await pc.waitForSelector("[role=alertdialog]", { timeout: 15000 });
ok("computador diz 'Já registrado'", /Já registrado às/.test(await pc.locator("[role=alertdialog]").textContent()));
const linhas = await sql(`select count(*)::int as n, min(hora_entrada)=max(hora_entrada) as mesma_hora from public.inscritos where codigo='${cod}'`);
ok("banco: 1 linha, 1 hora de entrada", linhas[0].n === 1 && linhas[0].mesma_hora, JSON.stringify(linhas));
await pc.locator("[role=alertdialog]").click();

// cadastro de porta feito no celular precisa aparecer no computador
await cel.fill("#porta-nome", "Novo Pelo Celular");
await cel.fill("#porta-telefone", "61955554444");
await cel.selectOption("#porta-profissao", "Outra");
await cel.fill("#porta-email", "novo.celular@exemplo.com");
await cel.click("text=Registrar entrada");
await cel.waitForSelector("[role=alertdialog]", { timeout: 15000 });
await cel.locator("[role=alertdialog]").click();
await pc.fill("#busca", "Novo Pelo Celular");
const t1 = Date.now();
await pc.locator("li", { hasText: "Novo Pelo Celular" }).waitFor({ timeout: 30000 })
  .then(() => ok("cadastro do celular apareceu no computador", true, `${Date.now() - t1} ms`))
  .catch(() => ok("cadastro do celular apareceu no computador", false));

await sql(`delete from public.inscritos where email in ('dois.teste@exemplo.com','novo.celular@exemplo.com')`);
console.log(`\n${res.filter(Boolean).length}/${res.length} passaram`);
await b.close();
process.exit(res.every(Boolean) ? 0 : 1);
