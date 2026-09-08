"use client";

import { gerarCodigo } from "@/lib/codigo";
import { enviarOuEnfileirar, novaOperacao } from "@/lib/fila/fila";
import type { Inscrito, NovoInscrito } from "@/lib/tipos";
import type { DadosInscricao } from "@/lib/validacao";
import type { BaseInscritos } from "./base";

export type ResultadoRecepcao =
  | { status: "ok"; inscrito: Inscrito; pendente: boolean }
  | { status: "ja_registrado"; inscrito: Inscrito }
  | { status: "nao_encontrado"; codigo: string; offline: boolean };

/**
 * Check-in idempotente pela recepção. Consulta primeiro a base local
 * (instantâneo e funciona offline); depois envia ou enfileira.
 */
export async function fazerCheckin(codigo: string, base: BaseInscritos): Promise<ResultadoRecepcao> {
  const local = base.porCodigo(codigo);
  if (local?.presente) return { status: "ja_registrado", inscrito: local };

  const offline = !navigator.onLine;
  if (!local && offline) return { status: "nao_encontrado", codigo, offline: true };

  const horaEntrada = new Date().toISOString();
  if (local) base.aplicarLocal({ ...local, presente: true, hora_entrada: horaEntrada });

  const envio = await enviarOuEnfileirar(novaOperacao({ tipo: "checkin", codigo, horaEntrada }));

  if (envio.envio === "pendente") {
    if (!local) return { status: "nao_encontrado", codigo, offline: true };
    return { status: "ok", inscrito: { ...local, presente: true, hora_entrada: horaEntrada }, pendente: true };
  }

  const r = envio.resultado;
  if (!r) return { status: "nao_encontrado", codigo, offline: false };
  if (r.status === "nao_encontrado") {
    if (local) base.aplicarLocal(local); // desfaz o otimismo
    return { status: "nao_encontrado", codigo, offline: false };
  }
  base.aplicarLocal(r.inscrito);
  if (r.status === "ja_registrado") return { status: "ja_registrado", inscrito: r.inscrito };
  return { status: "ok", inscrito: r.inscrito, pendente: false };
}

/** Cadastro rápido na porta: entra como presente na hora, origem 'porta'. */
export async function cadastrarNaPorta(
  dados: DadosInscricao,
  base: BaseInscritos,
): Promise<{ inscrito: Inscrito; pendente: boolean }> {
  const agora = new Date().toISOString();
  const novo: NovoInscrito & { criado_em: string } = {
    codigo: gerarCodigo(),
    ...dados,
    presente: true,
    hora_entrada: agora,
    origem: "porta",
    criado_em: agora,
  };
  const op = novaOperacao({ tipo: "porta", dados: novo });
  const inscrito: Inscrito = { id: op.id, atualizado_em: agora, ...novo };
  base.aplicarLocal(inscrito);
  const envio = await enviarOuEnfileirar(op);
  return { inscrito, pendente: envio.envio === "pendente" };
}
