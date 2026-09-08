// Teste de navegador da área de gestão. Requer um usuário da equipe:
//   EMAIL=... SENHA=... node teste-gestao.mjs
import { chromium } from "playwright";
import fs from "node:fs";

const REF = process.env.SUPABASE_REF || "fcbpcrakjakyagcvbxqq";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const { EMAIL, SENHA } = process.env;
if (!EMAIL || !SENHA) { console.error("Defina EMAIL e SENHA"); process.exit(2); }
const DIR = decodeURIComponent(new URL("./capturas/", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
fs.mkdirSync(DIR, { recursive: true });
const T = process.env.SUPABASE_ACCESS_TOKEN;
if (!T) { console.error("Defina SUPABASE_ACCESS_TOKEN (token pessoal do Supabase) para verificar e limpar o banco."); process.exit(2); }
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  return r.json();
}
const res = [];
const ok = (n, c, x = "") => { res.push(!!c); console.log(`${c ? "PASS" : "FAIL"} ${n} ${x}`); };

// participante de teste inscrito "online"
const cod = `WL-G${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
await sql(`insert into public.inscritos (codigo,nome,telefone,profissao,email) values ('${cod}','Participante Gestao Teste','(61) 90000-1111','Eletricista','gestao.teste@exemplo.com')`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, locale: "pt-BR", acceptDownloads: true });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));

// login
await page.goto(`${BASE}/gestao/login`, { waitUntil: "networkidle" });
await page.fill("#login-email", EMAIL);
await page.fill("#login-senha", SENHA);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(/\/gestao(#.*)?$/, { timeout: 20000 });
ok("login entra em /gestao", page.url().includes("/gestao") && !page.url().includes("login"), page.url());
await page.waitForSelector("text=na base local", { timeout: 20000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${DIR}/shot-06-recepcao.png`, fullPage: true });

// busca e check-in por botão
await page.fill("#busca", "Participante Gestao");
await page.waitForTimeout(400);
const item = page.locator("li", { hasText: cod });
ok("inscrito aparece na busca", (await item.count()) === 1);
await item.getByRole("button", { name: "Confirmar entrada" }).click();
await page.waitForSelector("[role=alertdialog]", { timeout: 10000 });
ok("confirmação grande com nome", (await page.locator("[role=alertdialog]").textContent()).includes("Participante Gestao Teste"));
await page.screenshot({ path: `${DIR}/shot-07-confirmacao.png` });
await page.locator("[role=alertdialog]").click();
await page.waitForTimeout(1500);
const l1 = await sql(`select presente, hora_entrada from public.inscritos where codigo='${cod}'`);
ok("check-in gravado no banco", l1[0]?.presente === true && !!l1[0]?.hora_entrada, JSON.stringify(l1));
ok("lista mostra Presente · HH:MM", /Presente · \d\d:\d\d/.test(await item.textContent()));

// check-in repetido pela busca por código + Enter
await page.fill("#busca", cod);
await page.press("#busca", "Enter");
await page.waitForSelector("[role=alertdialog]", { timeout: 10000 });
ok("repetido → 'Já registrado às'", /Já registrado às \d\d:\d\d/.test(await page.locator("[role=alertdialog]").textContent()));
await page.locator("[role=alertdialog]").click();

// cadastro na porta
await page.fill("#porta-nome", "Visitante Porta Teste");
await page.fill("#porta-telefone", "61977776666");
await page.selectOption("#porta-profissao", "Lojista / Revendedor(a)");
await page.fill("#porta-email", "porta.teste@exemplo.com");
await page.getByRole("button", { name: "Registrar entrada" }).click();
await page.waitForSelector("[role=alertdialog]", { timeout: 10000 });
await page.locator("[role=alertdialog]").click();
await page.waitForTimeout(1500);
const l2 = await sql(`select presente, origem from public.inscritos where email='porta.teste@exemplo.com'`);
ok("porta gravado presente/origem porta", l2[0]?.presente === true && l2[0]?.origem === "porta", JSON.stringify(l2));

// painel reflete (tempo real) + check-in feito "em outro aparelho" via SQL
await page.click("text=Painel");
await page.waitForTimeout(800);
await page.screenshot({ path: `${DIR}/shot-08-painel.png`, fullPage: true });
const presentesAntes = Number(await page.locator("text=Presentes agora").locator("xpath=preceding-sibling::div").textContent());
const cod2 = `WL-H${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
await sql(`insert into public.inscritos (codigo,nome,telefone,profissao,email,presente,hora_entrada) values ('${cod2}','Outro Aparelho Teste','(61) 90000-2222','Arquiteto(a)','outro.teste@exemplo.com',true,now())`);
const t0 = Date.now();
await page.waitForFunction((n) => { const el=[...document.querySelectorAll("div")].find(d=>d.textContent==="Presentes agora"); return el && Number(el.previousElementSibling.textContent) >= n; }, presentesAntes + 1, { timeout: 15000 }).then(() => ok("painel atualizou em tempo real", true, `${Date.now()-t0} ms`)).catch(() => ok("painel atualizou em tempo real", false));
ok("feed mostra a entrada", await page.getByText("Outro Aparelho Teste").isVisible());

// CSV
const [download] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), page.getByRole("button", { name: /Exportar CSV/ }).click()]);
const caminho = `${DIR}/export.csv`;
await download.saveAs(caminho);
const buf = fs.readFileSync(caminho);
ok("CSV com BOM UTF-8", buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);
const txt = buf.toString("utf8");
ok("CSV com ; e cabeçalho acentuado", txt.startsWith("\uFEFFCódigo;Nome;Telefone;Profissão"));
ok("CSV contém os registros", txt.includes(cod) && txt.includes("Visitante Porta Teste"));

// offline na recepção: check-in + porta sem rede, depois sincroniza
await page.click("text=Recepção");
const cod3 = `WL-I${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
await sql(`insert into public.inscritos (codigo,nome,telefone,profissao,email) values ('${cod3}','Offline Recepcao Teste','(61) 90000-3333','Eletricista','offline.recepcao@exemplo.com')`);
await page.waitForTimeout(2500); // realtime traz o novo inscrito
await ctx.setOffline(true);
await page.waitForTimeout(500);
await page.fill("#busca", cod3);
await page.press("#busca", "Enter");
await page.waitForSelector("[role=alertdialog]", { timeout: 10000 });
ok("check-in offline confirma (pendente)", /será enviada/i.test(await page.locator("[role=alertdialog]").textContent()));
await page.locator("[role=alertdialog]").click();
await page.fill("#porta-nome", "Porta Offline Teste");
await page.fill("#porta-telefone", "61966665555");
await page.selectOption("#porta-profissao", "Outra");
await page.fill("#porta-email", "porta.offline@exemplo.com");
await page.getByRole("button", { name: "Registrar entrada" }).click();
await page.waitForSelector("[role=alertdialog]", { timeout: 10000 });
await page.locator("[role=alertdialog]").click();
ok("indicador mostra 2 pendentes", /2 pendentes/.test(await page.locator("header button").first().textContent()));
await page.screenshot({ path: `${DIR}/shot-09-recepcao-offline.png`, fullPage: true });
await ctx.setOffline(false);
await page.waitForFunction(() => /^\s*Online\s*$/.test(document.querySelector("header button").textContent), null, { timeout: 40000 }).then(() => ok("fila esvaziou ao voltar", true)).catch(() => ok("fila esvaziou ao voltar", false));
await page.waitForTimeout(1500);
const l3 = await sql(`select codigo, presente, origem from public.inscritos where codigo='${cod3}' or email='porta.offline@exemplo.com' order by codigo`);
ok("offline sincronizou sem duplicar", l3.length === 2 && l3.every((r) => r.presente), JSON.stringify(l3));

// sair
await page.click("text=Sair");
await page.waitForURL(/login/, { timeout: 15000 });
ok("sair volta ao login", page.url().includes("login"));

await sql(`delete from public.inscritos where email like '%teste@exemplo.com' or email like '%.teste@exemplo.com' or email in ('porta.offline@exemplo.com','offline.recepcao@exemplo.com','outro.teste@exemplo.com','gestao.teste@exemplo.com','porta.teste@exemplo.com')`);
console.log("\nerros de página:", erros.length ? erros : "nenhum");
console.log(`\n${res.filter(Boolean).length}/${res.length} passaram`);
await browser.close();
