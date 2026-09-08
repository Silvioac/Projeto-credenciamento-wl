"use client";

import {
  contarOperacoes,
  guardarOperacao,
  listarOperacoes,
  removerOperacao,
  type Operacao,
} from "@/lib/db/local";
import { inserirInscrito, registrarCheckin, type ResultadoCheckin } from "@/lib/inscricoes";
import { ehErroDeRede, ErroRede, ErroServidor, mensagemDeErro } from "@/lib/rede";
import { gerarUuid } from "@/lib/uuid";

/* ---------- estado observável ---------- */

export interface EstadoFila {
  pendentes: number;
  sincronizando: boolean;
  ultimaSincronizacao: number | null;
  ultimoErro: string | null;
}

let estado: EstadoFila = {
  pendentes: 0,
  sincronizando: false,
  ultimaSincronizacao: null,
  ultimoErro: null,
};

const ouvintes = new Set<(e: EstadoFila) => void>();

function notificar(parcial: Partial<EstadoFila>) {
  estado = { ...estado, ...parcial };
  for (const cb of ouvintes) cb(estado);
}

export function estadoAtualFila(): EstadoFila {
  return estado;
}

export function assinarFila(cb: (e: EstadoFila) => void): () => void {
  ouvintes.add(cb);
  cb(estado);
  return () => ouvintes.delete(cb);
}

export async function atualizarContagem(): Promise<number> {
  try {
    const n = await contarOperacoes();
    notificar({ pendentes: n });
    return n;
  } catch {
    return estado.pendentes;
  }
}

/* ---------- enfileirar ---------- */

/** Omit distributivo: preserva a união discriminada por `tipo`. */
type SemBase<T> = T extends unknown
  ? Omit<T, "id" | "criadaEm" | "tentativas" | "proximaTentativa" | "ultimoErro">
  : never;

export type NovaOperacao = SemBase<Operacao>;

export function novaOperacao(base: NovaOperacao): Operacao {
  return {
    ...base,
    id: gerarUuid(),
    criadaEm: Date.now(),
    tentativas: 0,
    proximaTentativa: 0,
  } as Operacao;
}

async function pedirBackgroundSync() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sync = (reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync;
    await sync?.register("sincronizar-fila");
  } catch {
    // Background Sync é opcional; o app já reenvia pelo evento `online` e por intervalo.
  }
}

export async function enfileirar(op: Operacao): Promise<void> {
  await guardarOperacao(op);
  await atualizarContagem();
  void pedirBackgroundSync();
}

/* ---------- executar ---------- */

type ResultadoOperacao = ResultadoCheckin | undefined;

async function executar(op: Operacao): Promise<ResultadoOperacao> {
  switch (op.tipo) {
    case "inscricao":
    case "porta":
      await inserirInscrito(op.dados);
      return undefined;
    case "checkin":
      return registrarCheckin(op.codigo, op.horaEntrada);
  }
}

export type StatusEnvio = "enviado" | "pendente";

export type ResultadoEnvio =
  | { envio: "enviado"; resultado: ResultadoOperacao }
  | { envio: "pendente" };

/**
 * Tenta enviar agora; se a rede falhar, guarda na fila e devolve "pendente".
 * Erros do servidor (permissão, dados inválidos) são propagados para a interface.
 */
export async function enviarOuEnfileirar(op: Operacao): Promise<ResultadoEnvio> {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  if (!offline) {
    try {
      const resultado = await executar(op);
      return { envio: "enviado", resultado };
    } catch (erro) {
      if (!ehErroDeRede(erro)) throw erro;
    }
  }
  await enfileirar(op);
  return { envio: "pendente" };
}

/* ---------- sincronizar ---------- */

const ATRASO_BASE_MS = 1_000;
const ATRASO_MAX_MS = 60_000;

function proximoAtraso(tentativas: number): number {
  const base = Math.min(ATRASO_BASE_MS * 2 ** tentativas, ATRASO_MAX_MS);
  return base + Math.random() * base * 0.25;
}

let emAndamento: Promise<void> | null = null;
let temporizador: ReturnType<typeof setTimeout> | null = null;

function agendar(ms: number) {
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    temporizador = null;
    void sincronizarFila();
  }, ms);
}

/** Processa a fila em ordem. Chamadas concorrentes reutilizam a execução em andamento. */
export function sincronizarFila(): Promise<void> {
  if (emAndamento) return emAndamento;
  emAndamento = (async () => {
    let ops: Operacao[];
    try {
      ops = await listarOperacoes();
    } catch {
      return;
    }
    notificar({ pendentes: ops.length });
    if (ops.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    notificar({ sincronizando: true });
    const agora = Date.now();
    let menorEspera = Infinity;
    try {
      for (const op of ops) {
        if (op.proximaTentativa > agora) {
          menorEspera = Math.min(menorEspera, op.proximaTentativa - agora);
          continue;
        }
        try {
          await executar(op);
          await removerOperacao(op.id);
          notificar({ pendentes: estado.pendentes - 1, ultimoErro: null });
        } catch (erro) {
          const tentativas = op.tentativas + 1;
          const atraso = proximoAtraso(tentativas);
          await guardarOperacao({
            ...op,
            tentativas,
            proximaTentativa: Date.now() + atraso,
            ultimoErro: mensagemDeErro(erro),
          });
          menorEspera = Math.min(menorEspera, atraso);
          if (ehErroDeRede(erro) || erro instanceof ErroRede) {
            // Sem rede: não adianta insistir nas demais agora.
            notificar({ ultimoErro: "Sem conexão. Tentando novamente em instantes." });
            break;
          }
          if (erro instanceof ErroServidor) {
            notificar({ ultimoErro: erro.message });
          }
        }
      }
    } finally {
      const restantes = await atualizarContagem();
      notificar({ sincronizando: false, ultimaSincronizacao: Date.now() });
      if (restantes > 0 && Number.isFinite(menorEspera)) agendar(Math.max(menorEspera, 500));
    }
  })().finally(() => {
    emAndamento = null;
  });
  return emAndamento;
}

/* ---------- gatilhos automáticos ---------- */

const INTERVALO_MS = 15_000;
let iniciado = false;

/** Liga os gatilhos de sincronização (chamar uma vez, no cliente). */
export function iniciarSincronizacaoAutomatica(): () => void {
  if (iniciado || typeof window === "undefined") return () => {};
  iniciado = true;

  const aoVoltarOnline = () => void sincronizarFila();
  const aoFicarVisivel = () => {
    if (document.visibilityState === "visible") void sincronizarFila();
  };
  const aoMensagemSW = (ev: MessageEvent) => {
    if (ev.data?.tipo === "SINCRONIZAR_FILA") void sincronizarFila();
  };

  window.addEventListener("online", aoVoltarOnline);
  // Celular: ao voltar das configurações (modo avião) o navegador dispara focus/pageshow/visibilidade.
  window.addEventListener("focus", aoVoltarOnline);
  window.addEventListener("pageshow", aoVoltarOnline);
  document.addEventListener("visibilitychange", aoFicarVisivel);
  navigator.serviceWorker?.addEventListener("message", aoMensagemSW);
  const intervalo = setInterval(() => void sincronizarFila(), INTERVALO_MS);

  void atualizarContagem();
  void sincronizarFila();

  return () => {
    iniciado = false;
    window.removeEventListener("online", aoVoltarOnline);
    window.removeEventListener("focus", aoVoltarOnline);
    window.removeEventListener("pageshow", aoVoltarOnline);
    document.removeEventListener("visibilitychange", aoFicarVisivel);
    navigator.serviceWorker?.removeEventListener("message", aoMensagemSW);
    clearInterval(intervalo);
  };
}
