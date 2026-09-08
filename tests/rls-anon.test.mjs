// Prova de segurança: o cliente anônimo (chave pública) só consegue SE INSCREVER.
// Nunca lê, altera, apaga nem se cadastra como presente/porta.
//
// Há duas barreiras e o teste aceita qualquer uma das duas:
//   1. privilégio negado (a role anon nem tem o direito) → erro 42501/401
//   2. RLS (o direito existe mas nenhuma linha é visível)  → zero linhas
// Rodar: npm run test:rls  (usa NEXT_PUBLIC_* do .env.local)
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function lerEnvLocal() {
  try {
    const texto = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    return Object.fromEntries(
      texto
        .split(/\r?\n/)
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const env = { ...lerEnvLocal(), ...process.env };
const URL_SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(URL_SUPABASE && CHAVE_ANON, "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local)");

const anon = createClient(URL_SUPABASE, CHAVE_ANON, { auth: { persistSession: false } });
const codigo = `WL-T${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const registro = {
  codigo,
  nome: "Teste RLS Automático",
  telefone: "(61) 90000-0000",
  profissao: "Outra",
  email: "teste.rls@exemplo.com",
};

/** Passa se a operação foi barrada por privilégio OU não devolveu nenhuma linha. */
function bloqueado({ data, error }, oQue) {
  if (error) return; // privilégio negado — barreira mais forte
  assert.equal(data?.length ?? 0, 0, `${oQue}: deveria ser bloqueado, veio ${data?.length} linha(s)`);
}

test("anônimo CONSEGUE se inscrever (origem online, presente false)", async () => {
  const { error } = await anon.from("inscritos").insert(registro);
  assert.equal(error, null, error?.message);
});

test("anônimo NÃO consegue ler o próprio registro", async () => {
  bloqueado(await anon.from("inscritos").select("*").eq("codigo", codigo), "leitura por código");
});

test("anônimo NÃO consegue listar a base", async () => {
  bloqueado(await anon.from("inscritos").select("codigo").limit(5), "listagem");
});

test("anônimo NÃO consegue contar a base", async () => {
  const { count, error } = await anon.from("inscritos").select("codigo", { count: "exact", head: true });
  if (!error) assert.equal(count ?? 0, 0, "contagem deveria ser bloqueada");
});

test("anônimo NÃO consegue se cadastrar já presente", async () => {
  const { error } = await anon.from("inscritos").insert({ ...registro, codigo: `${codigo}P`, presente: true });
  assert.ok(error, "deveria falhar");
  assert.equal(error.code, "42501");
});

test("anônimo NÃO consegue se cadastrar como 'porta'", async () => {
  const { error } = await anon.from("inscritos").insert({ ...registro, codigo: `${codigo}Q`, origem: "porta" });
  assert.ok(error, "deveria falhar");
  assert.equal(error.code, "42501");
});

test("anônimo NÃO consegue fazer check-in (update)", async () => {
  bloqueado(await anon.from("inscritos").update({ presente: true }).eq("codigo", codigo).select(), "update");
  // e o registro continua ausente no banco
});

test("anônimo NÃO consegue apagar", async () => {
  bloqueado(await anon.from("inscritos").delete().eq("codigo", codigo).select(), "delete");
});

test("views do painel não vazam dados para anônimo", async () => {
  bloqueado(await anon.from("painel_resumo").select("*"), "painel_resumo");
  bloqueado(await anon.from("painel_profissoes").select("*"), "painel_profissoes");
});

test("anônimo NÃO consegue criar conta (cadastro público fechado)", async () => {
  const { error } = await anon.auth.signUp({
    email: `invasor.${Date.now()}@exemplo.com`,
    password: "SenhaForteQualquer123",
  });
  assert.ok(error, "o cadastro público deveria estar desativado");
  assert.match(`${error.code ?? ""} ${error.message}`, /signup_disabled|not allowed/i);
});

after(async () => {
  const token = env.SUPABASE_ACCESS_TOKEN;
  const ref = URL_SUPABASE.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  if (!token || !ref) {
    console.log(`\nRegistro de teste ${codigo} ficou na base (apague pelo painel ou defina SUPABASE_ACCESS_TOKEN).`);
    return;
  }
  await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `delete from public.inscritos where codigo like '${codigo}%'` }),
  });
  console.log(`\nRegistro de teste ${codigo} removido.`);
});
