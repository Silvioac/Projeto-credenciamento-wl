// Responsividade: nenhuma tela pode rolar na horizontal, em nenhuma largura.
// Estoura na horizontal é sinal de que algum bloco não encolhe — no celular
// isso empurra botões para fora do alcance do dedo.
//
//   EMAIL=... SENHA=... [BASE_URL=...] node tests/navegador/responsivo.mjs
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const { EMAIL, SENHA } = process.env;
if (!EMAIL || !SENHA) { console.error("Defina EMAIL e SENHA de um usuário da equipe."); process.exit(2); }

const SAIDA = decodeURIComponent(new URL("./capturas/", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
fs.mkdirSync(SAIDA, { recursive: true });

// Da menor tela ainda em uso (iPhone SE / Android básico) ao desktop.
const LARGURAS = [
  { nome: "320 (mínimo)", w: 320, h: 700, mobile: true },
  { nome: "360 (Android comum)", w: 360, h: 740, mobile: true },
  { nome: "390 (iPhone atual)", w: 390, h: 844, mobile: true },
  { nome: "414 (celular grande)", w: 414, h: 896, mobile: true },
  { nome: "768 (tablet retrato)", w: 768, h: 1024, mobile: true },
  { nome: "1024 (tablet paisagem)", w: 1024, h: 768, mobile: false },
  { nome: "1280 (notebook)", w: 1280, h: 800, mobile: false },
];

const res = [];
const ok = (n, c, x = "") => { res.push(!!c); console.log(`${c ? "PASS" : "FAIL"} ${n} ${x}`); };

/** Devolve o quanto a página estoura e quem são os culpados. */
const medirEstouro = (p) =>
  p.evaluate(() => {
    const larg = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const fora = [...document.querySelectorAll("*")].filter((el) => {
      const c = el.getBoundingClientRect();
      return c.width > 0 && c.right > larg + 1;
    });
    const folhas = fora.filter((el) => ![...el.children].some((f) => fora.includes(f)));
    return {
      larg, sw, sobra: sw - larg,
      culpados: folhas.slice(0, 3).map((el) => `<${el.tagName.toLowerCase()} class="${String(el.className || "").slice(0, 45)}">`),
    };
  });

/** Nenhum controle pode ficar fora da largura visível nem ser pequeno demais para o dedo. */
const medirControles = (p) =>
  p.evaluate(() => {
    const larg = document.documentElement.clientWidth;
    const problemas = [];
    for (const el of document.querySelectorAll("button, a[href], input, select")) {
      const c = el.getBoundingClientRect();
      if (c.width === 0 || c.height === 0) continue;
      const rotulo = (el.textContent || el.getAttribute("placeholder") || el.id || el.tagName).trim().slice(0, 30);
      if (c.right > larg + 1 || c.left < -1) problemas.push(`fora da tela: "${rotulo}"`);
      else if (c.height < 32 && el.tagName !== "A") problemas.push(`alvo pequeno (${Math.round(c.height)}px): "${rotulo}"`);
    }
    return problemas;
  });

const b = await chromium.launch();

for (const v of LARGURAS) {
  const ctx = await b.newContext({
    viewport: { width: v.w, height: v.h },
    isMobile: v.mobile,
    hasTouch: v.mobile,
    deviceScaleFactor: 1,
    locale: "pt-BR",
  });
  const p = await ctx.newPage();
  console.log(`\n=== ${v.nome} ===`);

  // ---------- inscrição pública ----------
  await p.goto(`${BASE}/inscricao`, { waitUntil: "networkidle" });
  let m = await medirEstouro(p);
  ok(`inscrição sem rolagem horizontal`, m.sobra <= 0, m.sobra > 0 ? `sobra ${m.sobra}px ${m.culpados.join(" ")}` : "");
  let c = await medirControles(p);
  ok(`inscrição com controles no lugar`, c.length === 0, c.slice(0, 2).join("; "));
  await p.screenshot({ path: `${SAIDA}/resp-${v.w}-inscricao.png`, fullPage: true });

  // ---------- credencial e comprovante ----------
  await p.fill("#f-nome", "Maria Da Conceição Nascimento");
  await p.fill("#f-telefone", "61999998888");
  await p.selectOption("#f-profissao", "Construtor(a) / Empreiteiro(a)");
  await p.fill("#f-email", `resp.${v.w}@carga.teste`);
  await p.click("text=Confirmar inscrição");
  await p.waitForSelector("#comprovante", { timeout: 30000 });
  m = await medirEstouro(p);
  ok(`credencial e comprovante sem rolagem horizontal`, m.sobra <= 0, m.sobra > 0 ? `sobra ${m.sobra}px ${m.culpados.join(" ")}` : "");
  await p.screenshot({ path: `${SAIDA}/resp-${v.w}-credencial.png`, fullPage: true });

  // ---------- login ----------
  await p.goto(`${BASE}/gestao/login`, { waitUntil: "networkidle" });
  m = await medirEstouro(p);
  ok(`login sem rolagem horizontal`, m.sobra <= 0, m.sobra > 0 ? `sobra ${m.sobra}px ${m.culpados.join(" ")}` : "");

  // ---------- recepção ----------
  await p.fill("#login-email", EMAIL);
  await p.fill("#login-senha", SENHA);
  await p.click("text=Entrar");
  await p.waitForURL(/\/gestao$/, { timeout: 30000 });
  await p.waitForSelector("text=na base local", { timeout: 90000 });
  await p.waitForTimeout(2500);
  m = await medirEstouro(p);
  ok(`recepção sem rolagem horizontal`, m.sobra <= 0, m.sobra > 0 ? `sobra ${m.sobra}px ${m.culpados.join(" ")}` : "");
  c = await medirControles(p);
  ok(`recepção com controles no lugar`, c.length === 0, c.slice(0, 2).join("; "));
  await p.screenshot({ path: `${SAIDA}/resp-${v.w}-recepcao.png`, fullPage: true });

  // com busca ativa a lista fica maior; nomes longos não podem alargar a página
  await p.fill("#busca", "a");
  await p.waitForTimeout(600);
  m = await medirEstouro(p);
  ok(`recepção com lista cheia sem rolagem horizontal`, m.sobra <= 0, m.sobra > 0 ? `sobra ${m.sobra}px ${m.culpados.join(" ")}` : "");

  // ---------- painel ----------
  const temPainel = (await p.getByRole("button", { name: "Painel", exact: true }).count()) === 1;
  if (temPainel) {
    await p.click("text=Painel");
    await p.locator("text=Presentes agora").waitFor({ timeout: 30000 });
    await p.waitForTimeout(800);
    m = await medirEstouro(p);
    ok(`painel sem rolagem horizontal`, m.sobra <= 0, m.sobra > 0 ? `sobra ${m.sobra}px ${m.culpados.join(" ")}` : "");
    c = await medirControles(p);
    ok(`painel com controles no lugar`, c.length === 0, c.slice(0, 2).join("; "));
    await p.screenshot({ path: `${SAIDA}/resp-${v.w}-painel.png`, fullPage: true });
  }
  await ctx.close();
}

await b.close();
console.log(`\nCapturas em: ${SAIDA}`);
console.log(`${res.filter(Boolean).length}/${res.length} passaram`);
process.exit(res.every(Boolean) ? 0 : 1);
