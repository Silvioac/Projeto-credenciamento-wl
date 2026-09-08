// Perfis de acesso: recepção x administrativo.
// Verifica a interface (abas e exportação) e, principalmente, a trava no banco,
// que vale mesmo para quem chamar a API direto, sem passar pela tela.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... EMAIL=... SENHA=... \
//     [BASE_URL=https://credenciamento-wl.vercel.app] node tests/navegador/perfis.mjs
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const REF = process.env.SUPABASE_REF || "fcbpcrakjakyagcvbxqq";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const { EMAIL, SENHA } = process.env;
const T = process.env.SUPABASE_ACCESS_TOKEN;
if (!T || !EMAIL || !SENHA) { console.error("Defina SUPABASE_ACCESS_TOKEN, EMAIL e SENHA."); process.exit(2); }

function envLocal() {
  try {
    return Object.fromEntries(
      readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
        .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
    );
  } catch { return {}; }
}
const env = { ...envLocal(), ...process.env };
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sql = async (query) =>
  (await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })).json();

const res = [];
const ok = (n, c, x = "") => { res.push(!!c); console.log(`${c ? "PASS" : "FAIL"} ${n} ${x}`); };
const definirPerfil = (p) => sql(`update public.perfis set perfil='${p}' where usuario_id = (select id from auth.users where email='${EMAIL}')`);

// participante de teste, sempre com a marca que permite apagar depois
const cod = `WL-P${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
await sql(`insert into public.inscritos (codigo,nome,telefone,profissao,email) values ('${cod}','Alvo Do Teste Perfis','(61) 90000-7777','Outra','perfis.teste@carga.teste')`);

const b = await chromium.launch();
async function abrirGestao() {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, locale: "pt-BR" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/gestao/login`, { waitUntil: "networkidle" });
  await p.fill("#login-email", EMAIL);
  await p.fill("#login-senha", SENHA);
  await p.click("text=Entrar");
  await p.waitForURL(/\/gestao$/, { timeout: 30000 });
  await p.waitForSelector("text=na base local", { timeout: 60000 });
  await p.waitForTimeout(2500); // deixa o perfil chegar do servidor
  return p;
}

// ================= PERFIL RECEPÇÃO =================
console.log("\n--- perfil recepcao ---");
await definirPerfil("recepcao");
const rec = await abrirGestao();
ok("cabeçalho mostra 'Recepção'", (await rec.locator("header").textContent()).includes("Recepção"));
ok("aba Painel NÃO aparece", (await rec.getByRole("button", { name: "Painel", exact: true }).count()) === 0);
ok("botão de exportar NÃO aparece", (await rec.getByRole("button", { name: /Exportar/ }).count()) === 0);
await rec.goto(`${BASE}/gestao#painel`, { waitUntil: "networkidle" });
await rec.waitForTimeout(2500);
ok("forçar #painel na URL não abre o painel", (await rec.locator("text=Presentes agora").count()) === 0);
ok("recepção continua vendo o check-in", (await rec.locator("#busca").count()) === 1);

// trava no banco, chamando a API direto (sem passar pela tela)
const sbRec = createClient(URL_SB, CHAVE, { auth: { persistSession: false } });
await sbRec.auth.signInWithPassword({ email: EMAIL, password: SENHA });
const perfilVisto = await sbRec.from("perfis").select("perfil").maybeSingle();
ok("API confirma perfil recepcao", perfilVisto.data?.perfil === "recepcao", JSON.stringify(perfilVisto.data));

const trocarNome = await sbRec.from("inscritos").update({ nome: "NOME ALTERADO INDEVIDAMENTE" }).eq("codigo", cod).select();
ok("recepção NÃO altera o nome", !!trocarNome.error, trocarNome.error?.message?.slice(0, 60) ?? "sem erro!");
const trocarEmail = await sbRec.from("inscritos").update({ email: "outro@exemplo.com" }).eq("codigo", cod).select();
ok("recepção NÃO altera o e-mail", !!trocarEmail.error, trocarEmail.error?.message?.slice(0, 60) ?? "sem erro!");
const fazCheckin = await sbRec.from("inscritos").update({ presente: true, hora_entrada: new Date().toISOString() }).eq("codigo", cod).select();
ok("recepção CONSEGUE registrar entrada", !fazCheckin.error && fazCheckin.data?.length === 1, fazCheckin.error?.message?.slice(0, 60) ?? "");
const desfaz = await sbRec.from("inscritos").update({ presente: false, hora_entrada: null }).eq("codigo", cod).select();
ok("recepção NÃO desfaz uma entrada", !!desfaz.error, desfaz.error?.message?.slice(0, 60) ?? "sem erro!");
const apaga = await sbRec.from("inscritos").delete().eq("codigo", cod).select();
ok("recepção NÃO apaga registro", !!apaga.error || (apaga.data?.length ?? 0) === 0);
await sbRec.auth.signOut();

// ================= PERFIL ADMINISTRATIVO =================
console.log("\n--- perfil admin ---");
await definirPerfil("admin");
const adm = await abrirGestao();
ok("cabeçalho mostra 'Administrativo'", (await adm.locator("header").textContent()).includes("Administrativo"));
ok("aba Painel aparece", (await adm.getByRole("button", { name: "Painel", exact: true }).count()) === 1);
await adm.click("text=Painel");
await adm.locator("text=Presentes agora").waitFor({ timeout: 30000 });
ok("painel abre com as métricas", true);
ok("exportar planilha disponível", (await adm.getByRole("button", { name: /Exportar planilha/ }).count()) === 1);
ok("exportar relatório disponível", (await adm.getByRole("button", { name: /Exportar relatório/ }).count()) === 1);

const sbAdm = createClient(URL_SB, CHAVE, { auth: { persistSession: false } });
await sbAdm.auth.signInWithPassword({ email: EMAIL, password: SENHA });
const corrige = await sbAdm.from("inscritos").update({ nome: "Alvo Do Teste Perfis Corrigido" }).eq("codigo", cod).select();
ok("admin CONSEGUE corrigir cadastro", !corrige.error && corrige.data?.length === 1, corrige.error?.message?.slice(0, 60) ?? "");
const desfazAdm = await sbAdm.from("inscritos").update({ presente: false, hora_entrada: null }).eq("codigo", cod).select();
ok("admin CONSEGUE desfazer entrada", !desfazAdm.error && desfazAdm.data?.length === 1, desfazAdm.error?.message?.slice(0, 60) ?? "");
await sbAdm.auth.signOut();

await sql(`delete from public.inscritos where codigo='${cod}'`);
await definirPerfil("admin");
console.log(`\n${res.filter(Boolean).length}/${res.length} passaram`);
await b.close();
process.exit(res.every(Boolean) ? 0 : 1);
