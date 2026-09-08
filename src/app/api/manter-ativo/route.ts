import { NextResponse } from "next/server";
import { credenciaisSupabase } from "@/lib/supabase/env";

/**
 * Mantém o projeto Supabase ativo.
 *
 * O plano gratuito pausa projetos sem nenhuma requisição por 7 dias. Esta rota
 * chama a função `manter_ativo()` no banco (só devolve a hora do servidor, não
 * toca em dados de participantes) e é acionada uma vez por dia pelo cron
 * configurado em `vercel.json`.
 *
 * Se a variável CRON_SECRET existir, exige o cabeçalho que a Vercel envia
 * automaticamente; sem ela a rota fica aberta (a chamada é inofensiva).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const autorizacao = request.headers.get("authorization");
    if (autorizacao !== `Bearer ${segredo}`) {
      return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
    }
  }

  const inicio = Date.now();
  try {
    const { url, chave } = credenciaisSupabase();
    const resposta = await fetch(`${url}/rest/v1/rpc/manter_ativo`, {
      method: "POST",
      headers: { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      return NextResponse.json(
        { ok: false, erro: `Banco respondeu ${resposta.status}`, detalhe: detalhe.slice(0, 300) },
        { status: 502 },
      );
    }

    const horaDoBanco = await resposta.json();
    return NextResponse.json({
      ok: true,
      mensagem: "Projeto Supabase mantido ativo.",
      horaDoBanco,
      duracaoMs: Date.now() - inicio,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha desconhecida.";
    return NextResponse.json({ ok: false, erro: `Não foi possível falar com o banco: ${mensagem}` }, { status: 502 });
  }
}
