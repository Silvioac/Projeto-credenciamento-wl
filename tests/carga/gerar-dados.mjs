// Gera participantes fictícios para teste de carga.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node tests/carga/gerar-dados.mjs [quantidade]
//
// TODOS os registros recebem e-mail terminado em @carga.teste. É essa marca que
// permite apagar tudo depois sem nenhum risco de tocar num participante real
// (ver apagar-dados.mjs). Nunca remova esse sufixo.
const REF = process.env.SUPABASE_REF || "fcbpcrakjakyagcvbxqq";
const T = process.env.SUPABASE_ACCESS_TOKEN;
if (!T) { console.error("Defina SUPABASE_ACCESS_TOKEN."); process.exit(2); }

const QUANTIDADE = Number(process.argv[2] || 1500);
const MARCA = "@carga.teste";
const LOTE = 250;

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

const NOMES = ["José","João","Antônio","Francisco","Carlos","Paulo","Pedro","Lucas","Luiz","Marcos","Rafael","Daniel","Bruno","Eduardo","Felipe","Rodrigo","Gustavo","Thiago","Leandro","André","Sérgio","Márcio","Fábio","Vinícius","Anderson","Wesley","Douglas","Alexandre","Ricardo","Fernando","Maria","Ana","Francisca","Antônia","Adriana","Juliana","Márcia","Fernanda","Patrícia","Aline","Sandra","Camila","Amanda","Bruna","Jéssica","Letícia","Júlia","Luciana","Vanessa","Mariana","Conceição","Rosângela","Tatiane","Simone","Débora","Renata","Cristiane","Elaine","Priscila","Viviane"];
const SOBRENOMES = ["Silva","Santos","Oliveira","Souza","Rodrigues","Ferreira","Alves","Pereira","Lima","Gomes","Ribeiro","Carvalho","Almeida","Lopes","Soares","Fernandes","Vieira","Barbosa","Rocha","Dias","Nascimento","Andrade","Moreira","Nunes","Marques","Machado","Mendes","Freitas","Cardoso","Ramos","Gonçalves","Araújo","Correia","Teixeira","Azevedo","Cavalcanti","Monteiro","Moraes","Cunha","Pinto","D'Ávila","Assunção","Nóbrega","Sá","Aragão"];
// Peso maior para eletricista: é o Dia do Eletricista.
const PROFISSOES = [
  ["Eletricista", 42],
  ["Engenheiro(a) Eletricista", 12],
  ["Construtor(a) / Empreiteiro(a)", 12],
  ["Lojista / Revendedor(a)", 11],
  ["Engenheiro(a) Civil", 8],
  ["Arquiteto(a)", 6],
  ["Comprador(a) corporativo", 5],
  ["Outra", 4],
];
const DDDS = ["61","61","61","61","61","62","31","11","71","81"];

const sorteio = (a) => a[Math.floor(Math.random() * a.length)];
function sortearProfissao() {
  const total = PROFISSOES.reduce((s, [, p]) => s + p, 0);
  let n = Math.random() * total;
  for (const [nome, peso] of PROFISSOES) { n -= peso; if (n <= 0) return nome; }
  return PROFISSOES[0][0];
}
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "").toLowerCase();
const aspas = (s) => `'${String(s).replace(/'/g, "''")}'`;

const usados = new Set();
function codigo() {
  let c;
  do {
    const t = Date.now().toString(36).toUpperCase().slice(-3);
    const r = Array.from({ length: 3 }, () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 36)]).join("");
    c = `WL-${t}${r}`;
  } while (usados.has(c));
  usados.add(c);
  return c;
}

// Dia do evento: 17/10/2026, das 08h às 14h (horário de Brasília = UTC-3).
const DIA = "2026-10-17";
function horaEntrada() {
  // Pico de chegada entre 8h e 10h30, cauda até as 14h.
  const minutos = Math.random() < 0.65
    ? 0 + Math.floor(Math.random() * 150)
    : 150 + Math.floor(Math.random() * 210);
  const h = 8 + Math.floor(minutos / 60);
  const m = minutos % 60;
  const s = Math.floor(Math.random() * 60);
  return `${DIA}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}-03:00`;
}
function criadoEm(origem, entrada) {
  if (origem === "porta") return entrada; // cadastro na porta nasce no momento da entrada
  const diasAntes = 1 + Math.floor(Math.random() * 45);
  const d = new Date(`${DIA}T12:00:00-03:00`);
  d.setDate(d.getDate() - diasAntes);
  d.setHours(8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function gerar(i) {
  const nome = `${sorteio(NOMES)} ${sorteio(SOBRENOMES)} ${sorteio(SOBRENOMES)}`;
  const origem = Math.random() < 0.15 ? "porta" : "online";
  // Cadastro na porta entra sempre presente; inscrição online comparece em ~68% dos casos.
  const presente = origem === "porta" || Math.random() < 0.68;
  const entrada = presente ? horaEntrada() : null;
  const [p1, s1] = nome.split(" ");
  return {
    codigo: codigo(),
    nome,
    telefone: `(${sorteio(DDDS)}) 9${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`,
    profissao: sortearProfissao(),
    email: `${semAcento(p1)}.${semAcento(s1)}${i}${MARCA}`,
    presente,
    hora_entrada: entrada,
    origem,
    criado_em: criadoEm(origem, entrada ?? `${DIA}T08:00:00-03:00`),
  };
}

console.log(`Gerando ${QUANTIDADE} participantes fictícios (e-mails ${MARCA})...`);
const inicio = Date.now();
let inseridos = 0;
for (let lote = 0; lote < Math.ceil(QUANTIDADE / LOTE); lote++) {
  const n = Math.min(LOTE, QUANTIDADE - lote * LOTE);
  const valores = Array.from({ length: n }, (_, k) => {
    const p = gerar(lote * LOTE + k);
    return `(${aspas(p.codigo)},${aspas(p.nome)},${aspas(p.telefone)},${aspas(p.profissao)},${aspas(p.email)},${p.presente},${p.hora_entrada ? aspas(p.hora_entrada) : "null"},${aspas(p.origem)},${aspas(p.criado_em)})`;
  }).join(",");
  const r = await sql(
    `insert into public.inscritos (codigo,nome,telefone,profissao,email,presente,hora_entrada,origem,criado_em) values ${valores} on conflict (codigo) do nothing returning 1`,
  );
  inseridos += Array.isArray(r) ? r.length : 0;
  process.stdout.write(`  lote ${lote + 1}: ${inseridos} inseridos\r`);
}
const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
console.log(`\n${inseridos} participantes inseridos em ${segundos}s.`);

const resumo = await sql(
  `select count(*)::int as total,
          count(*) filter (where presente)::int as presentes,
          count(*) filter (where origem='porta')::int as porta
   from public.inscritos`,
);
console.log("Base agora:", JSON.stringify(resumo[0]));
console.log(`\nPara apagar depois: node tests/carga/apagar-dados.mjs`);
