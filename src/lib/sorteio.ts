"use client";

import { supabaseNavegador } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import { converterErro, ErroRede, sinalTimeout } from "@/lib/rede";

export type ParticipanteSorteio = Database["public"]["Tables"]["sorteio"]["Row"];

/** Entra no sorteio. Telefone repetido (23505) volta "ja_participa", não é erro. */
export async function entrarNoSorteio(nome: string, telefone: string): Promise<"ok" | "ja_participa"> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new ErroRede();
  const { error } = await supabaseNavegador()
    .from("sorteio")
    .insert({ nome, telefone })
    .abortSignal(sinalTimeout());
  if (!error) return "ok";
  if (error.code === "23505") return "ja_participa";
  throw converterErro(error);
}

export async function listarSorteio(): Promise<ParticipanteSorteio[]> {
  const { data, error } = await supabaseNavegador()
    .from("sorteio")
    .select("*")
    .order("criado_em", { ascending: true })
    .limit(5000)
    .abortSignal(sinalTimeout());
  if (error) throw converterErro(error);
  return data ?? [];
}

/** Marca o ganhador; ele sai das próximas rodadas. */
export async function marcarSorteado(id: string): Promise<void> {
  const { error } = await supabaseNavegador()
    .from("sorteio")
    .update({ sorteado_em: new Date().toISOString() })
    .eq("id", id)
    .abortSignal(sinalTimeout());
  if (error) throw converterErro(error);
}

/** Apaga todos os participantes do sorteio (não toca nos inscritos do evento). */
export async function zerarSorteio(): Promise<void> {
  const { error } = await supabaseNavegador()
    .from("sorteio")
    .delete()
    .not("id", "is", null)
    .abortSignal(sinalTimeout());
  if (error) throw converterErro(error);
}

/** Índice aleatório sem viés (crypto, não Math.random). */
export function indiceAleatorio(n: number): number {
  const limite = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limite);
  return buf[0] % n;
}
