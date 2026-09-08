import type { PostgrestError } from "@supabase/supabase-js";

/** Falha de conexão/timeout — a operação pode ser reenviada depois. */
export class ErroRede extends Error {
  constructor(mensagem = "Sem conexão com o servidor.") {
    super(mensagem);
    this.name = "ErroRede";
  }
}

/** Erro devolvido pelo servidor (validação, permissão) — reenviar igual não resolve. */
export class ErroServidor extends Error {
  readonly codigo: string;
  constructor(mensagem: string, codigo = "") {
    super(mensagem);
    this.name = "ErroServidor";
    this.codigo = codigo;
  }
}

/** Tempo máximo de espera por uma chamada ao Supabase. */
export const TIMEOUT_MS = 12_000;

export function sinalTimeout(ms = TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

/** Verdadeiro para erros de fetch/timeout/abort, que o supabase-js devolve sem `code`. */
export function ehErroDeRede(erro: unknown): boolean {
  if (erro instanceof ErroRede) return true;
  if (erro instanceof ErroServidor) return false;
  const msg = String(
    (erro as { message?: string } | null)?.message ?? erro ?? "",
  ).toLowerCase();
  const code = (erro as { code?: string } | null)?.code ?? "";
  if (code && code !== "" && !/^(5\d\d|PGRST0|ECONN|ETIMEDOUT)/.test(code)) return false;
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("abort") ||
    msg.includes("econn") ||
    msg.includes("socket") ||
    msg.includes("offline") ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  );
}

/** Converte o erro do supabase-js em ErroRede ou ErroServidor com mensagem em português. */
export function converterErro(erro: PostgrestError | Error | unknown): Error {
  if (erro instanceof ErroRede || erro instanceof ErroServidor) return erro;
  if (ehErroDeRede(erro)) return new ErroRede();
  const e = erro as { message?: string; code?: string; details?: string } | null;
  const code = e?.code ?? "";
  let mensagem = "Não foi possível concluir a operação.";
  if (code === "42501") mensagem = "Sem permissão para esta operação. Faça login novamente.";
  else if (code === "23514" || code === "22P02") mensagem = "Dados inválidos. Revise as informações.";
  else if (e?.message) mensagem = `Erro do servidor: ${e.message}`;
  return new ErroServidor(mensagem, code);
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  return "Ocorreu um erro inesperado.";
}
