// Apaga SOMENTE os participantes fictícios do teste de carga.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node tests/carga/apagar-dados.mjs           (mostra o que faria)
//   SUPABASE_ACCESS_TOKEN=sbp_... node tests/carga/apagar-dados.mjs --apagar  (apaga de verdade)
//
// O filtro é o sufixo @carga.teste no e-mail, colocado por gerar-dados.mjs.
// Nenhum participante real tem esse sufixo, então não há risco de apagar
// alguém de verdade. Por segurança, sem --apagar o script só conta.
const REF = process.env.SUPABASE_REF || "fcbpcrakjakyagcvbxqq";
const T = process.env.SUPABASE_ACCESS_TOKEN;
if (!T) { console.error("Defina SUPABASE_ACCESS_TOKEN."); process.exit(2); }

const MARCA = "%@carga.teste";
const APAGAR = process.argv.includes("--apagar");

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

if (!APAGAR) {
  console.log("\nNada foi apagado. Rode de novo com --apagar para confirmar.");
  process.exit(0);
}

const r = await sql(`delete from public.inscritos where email like '${MARCA}' returning 1`);
const depois = await sql(`select count(*)::int as total from public.inscritos`);
console.log(`\n${Array.isArray(r) ? r.length : 0} registros fictícios apagados.`);
console.log(`Restam ${depois[0].total} registros na base.`);
