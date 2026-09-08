import { evento } from "@/config/evento";

const ALFABETO = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Sorteia `n` caracteres do alfabeto sem viés (rejeição de amostras fora do múltiplo). */
function aleatorio(n: number): string {
  const limite = 256 - (256 % ALFABETO.length);
  let saida = "";
  const buffer = new Uint8Array(n * 2);
  while (saida.length < n) {
    crypto.getRandomValues(buffer);
    for (const b of buffer) {
      if (b < limite) saida += ALFABETO[b % ALFABETO.length];
      if (saida.length === n) break;
    }
  }
  return saida;
}

/**
 * Gera o código de inscrição `WL-XXXXXX` no cliente (funciona offline):
 * 3 caracteres do timestamp em base36 + 3 aleatórios.
 * A constraint UNIQUE no banco é a garantia final; colisão é tratada como
 * conflito 23505 (ver lib/inscricoes.ts).
 */
export function gerarCodigo(): string {
  const tempo = Date.now().toString(36).toUpperCase().slice(-3);
  return `${evento.prefixoCodigo}-${tempo}${aleatorio(3)}`;
}

const REGEX_CODIGO = new RegExp(`^${evento.prefixoCodigo}-[0-9A-Z]{6}$`);

/** Normaliza texto digitado ou lido no QR: aceita "wl-abc123", "WL ABC123" e "abc123". */
export function normalizarCodigo(texto: string): string | null {
  const limpo = texto.trim().toUpperCase().replace(/[\s_]+/g, "-");
  const candidato = /^[0-9A-Z]{6}$/.test(limpo) ? `${evento.prefixoCodigo}-${limpo}` : limpo;
  return REGEX_CODIGO.test(candidato) ? candidato : null;
}

export function pareceCodigo(texto: string): boolean {
  return normalizarCodigo(texto) !== null;
}
