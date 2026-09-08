import { evento } from "@/config/evento";
import { formatarDataHora, formatarHora } from "./formato";
import type { Inscrito } from "./tipos";

/**
 * Colunas do relatório — fonte única para CSV e PDF.
 * Enxuto de propósito: sem o identificador interno do banco, que não
 * diz nada para quem lê a planilha.
 */
export const COLUNAS_RELATORIO = [
  "Código",
  "Nome",
  "Telefone",
  "Profissão",
  "E-mail",
  "Presente",
  "Entrada",
  "Origem",
  "Inscrito em",
] as const;

export function linhasRelatorio(inscritos: Inscrito[]): string[][] {
  return inscritos.map((i) => [
    i.codigo,
    i.nome,
    i.telefone,
    i.profissao,
    i.email,
    i.presente ? "Sim" : "Não",
    i.presente ? formatarHora(i.hora_entrada) : "",
    i.origem === "porta" ? "Porta" : "Online",
    formatarDataHora(i.criado_em),
  ]);
}

/** Ordena por nome, que é como a organização costuma conferir a lista. */
export function ordenarParaRelatorio(inscritos: Inscrito[]): Inscrito[] {
  return [...inscritos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Base do nome do arquivo, ex.: inscritos-wl-experience-2026-20261017-0930 */
export function nomeArquivo(prefixo: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const carimbo = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  const nome = evento.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${prefixo}-${nome}-${carimbo}`;
}

/** Dispara o download de um Blob no navegador. */
export function baixarArquivo(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
