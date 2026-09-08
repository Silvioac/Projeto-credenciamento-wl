// Apaga participantes de teste.
//
//   node tests/carga/apagar-dados.mjs                      (mostra o que faria, não apaga)
//   node tests/carga/apagar-dados.mjs --apagar             (apaga só os fictícios @carga.teste)
//   node tests/carga/apagar-dados.mjs --tudo --sim-eu-quero (ZERA a tabela de inscritos)
//
// Sempre com SUPABASE_ACCESS_TOKEN=sbp_... no ambiente.
//
// O filtro padrão é o sufixo @carga.teste no e-mail, colocado por gerar-dados.mjs.
// Nenhum participante real tem esse sufixo, então --apagar não tem como atingir
// alguém de verdade. Já --tudo apaga TODOS os inscritos, inclusive reais: use
// apenas para zerar a base antes de divulgar o QR code do evento.
const REF = process.env.SUPABASE_REF || "fcbpcrakjakyagcvbxqq";
const T = process.env.SUPABASE_ACCESS_TOKEN;
if (!T) { console.error("Defina SUPABASE_ACCESS_TOKEN."); process.exit(2); }

const MARCA = "%@carga.teste";
const APAGAR = process.argv.includes("--apagar");
const TUDO = process.argv.includes("--tudo");
if (TUDO && !process.argv.includes("--sim-eu-quero")) {
  console.error("--tudo apaga TODOS os inscritos, inclusive reais.");
  console.error("Se é isso mesmo, repita com: --tudo --sim-eu-quero");
  process.exit(2);
}

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const corpo = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(corpo).slice(0, 300));
  return corpo;
};

const antes = await sql(
  `select count(*) filter (where email like '${MARCA}')::int as ficticios,
          count(*) filter (where email not like '${MARCA}')::int as reais
   from public.inscritos`,
);
console.log(`Fictícios (@carga.teste): ${antes[0].ficticios}`);
console.log(`Reais (serão preservados): ${antes[0].reais}`);

if (!APAGAR && !TUDO) {
  console.log("\nNada foi apagado. Rode de novo com --apagar para confirmar.");
  process.exit(0);
}

const filtro = TUDO ? "" : ` where email like '${MARCA}'`;
const r = await sql(`delete from public.inscritos${filtro} returning 1`);
const depois = await sql(`select count(*)::int as total from public.inscritos`);
console.log(`\n${Array.isArray(r) ? r.length : 0} registros apagados${TUDO ? " (base zerada)" : " (só os fictícios)"}.`);
console.log(`Restam ${depois[0].total} registros na base.`);
