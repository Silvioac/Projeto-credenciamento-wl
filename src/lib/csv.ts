import type { Inscrito } from "./tipos";
import {
  COLUNAS_PRESENTES,
  COLUNAS_RELATORIO,
  baixarArquivo,
  linhasPresentes,
  linhasRelatorio,
  nomeArquivo,
  ordenarParaRelatorio,
  somentePresentes,
} from "./relatorio";

const SEPARADOR = ";";

function celula(valor: string): string {
  const precisaAspas = /[";\n\r]/.test(valor);
  const escapado = valor.replace(/"/g, '""');
  return precisaAspas ? `"${escapado}"` : escapado;
}

/** CSV com separador ponto e vírgula e quebra CRLF — abre direto no Excel brasileiro. */
function montarCsv(cabecalho: readonly string[], linhas: string[][]): string {
  return [cabecalho, ...linhas].map((l) => l.map(celula).join(SEPARADOR)).join("\r\n") + "\r\n";
}

export function gerarCsv(inscritos: Inscrito[]): string {
  return montarCsv(COLUNAS_RELATORIO, linhasRelatorio(ordenarParaRelatorio(inscritos)));
}

/** Dispara o download com BOM UTF-8 (para acentos corretos no Excel). */
function baixarComoCsv(conteudo: string, prefixo: string): string {
  const nome = `${nomeArquivo(prefixo)}.csv`;
  // O "﻿" é o BOM: sem ele o Excel em português abre os acentos errados.
  baixarArquivo(new Blob(["﻿", conteudo], { type: "text/csv;charset=utf-8" }), nome);
  return nome;
}

export function baixarCsv(inscritos: Inscrito[]): string {
  return baixarComoCsv(gerarCsv(inscritos), "inscritos");
}

/** Só quem fez check-in, numerado — a lista do sorteio. */
export function baixarCsvPresentes(inscritos: Inscrito[]): { arquivo: string; total: number } {
  const presentes = somentePresentes(inscritos);
  const arquivo = baixarComoCsv(montarCsv(COLUNAS_PRESENTES, linhasPresentes(presentes)), "presentes");
  return { arquivo, total: presentes.length };
}
