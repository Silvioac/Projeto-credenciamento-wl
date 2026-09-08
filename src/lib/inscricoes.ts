"use client";

import { supabaseNavegador } from "@/lib/supabase/client";
import { comoInscrito, type Inscrito, type NovoInscrito } from "@/lib/tipos";
import { converterErro, ErroRede, sinalTimeout } from "@/lib/rede";

/**
 * Insere um inscrito. Idempotente: conflito de código (23505) é sucesso —
 * significa que um reenvio da fila já tinha chegado.
 */
export async function inserirInscrito(dados: NovoInscrito): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new ErroRede();
  const sb = supabaseNavegador();
  const { error } = await sb.from("inscritos").insert(dados).abortSignal(sinalTimeout());
  if (!error) return;
  if (error.code === "23505") return;
  throw converterErro(error);
}

export type ResultadoCheckin =
  | { status: "ok"; inscrito: Inscrito }
  | { status: "ja_registrado"; inscrito: Inscrito }
  | { status: "nao_encontrado" };

/**
 * Check-in idempotente: só atualiza quem ainda não está presente.
 * Se nada foi atualizado, consulta para saber se já estava presente.
 */
export async function registrarCheckin(codigo: string, horaEntrada: string): Promise<ResultadoCheckin> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new ErroRede();
  const sb = supabaseNavegador();
  const atualizado = await sb
    .from("inscritos")
    .update({ presente: true, hora_entrada: horaEntrada })
    .eq("codigo", codigo)
    .eq("presente", false)
    .select("*")
    .abortSignal(sinalTimeout());
  if (atualizado.error) throw converterErro(atualizado.error);
  if (atualizado.data && atualizado.data.length > 0) {
    return { status: "ok", inscrito: comoInscrito(atualizado.data[0]) };
  }
  const existente = await sb
    .from("inscritos")
    .select("*")
    .eq("codigo", codigo)
    .abortSignal(sinalTimeout())
    .maybeSingle();
  if (existente.error) throw converterErro(existente.error);
  if (!existente.data) return { status: "nao_encontrado" };
  return { status: "ja_registrado", inscrito: comoInscrito(existente.data) };
}

const TAMANHO_PAGINA = 1000;

/** Baixa a base completa paginando (o PostgREST limita 1000 linhas por chamada). */
export async function buscarTodosInscritos(): Promise<Inscrito[]> {
  const sb = supabaseNavegador();
  const todos: Inscrito[] = [];
  for (let pagina = 0; ; pagina++) {
    const de = pagina * TAMANHO_PAGINA;
    const { data, error } = await sb
      .from("inscritos")
      .select("*")
      .order("criado_em", { ascending: true })
      .range(de, de + TAMANHO_PAGINA - 1)
      .abortSignal(sinalTimeout(20_000));
    if (error) throw converterErro(error);
    todos.push(...(data ?? []).map(comoInscrito));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }
  return todos;
}
