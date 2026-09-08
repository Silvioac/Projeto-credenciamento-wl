import type { Inscrito } from "./tipos";
import {
  COLUNAS_RELATORIO,
  baixarArquivo,
  linhasRelatorio,
  nomeArquivo,
  ordenarParaRelatorio,
} from "./relatorio";

const SEPARADOR = ";";

function celula(valor: string): string {
  const precisaAspas = /[";\n\r]/.test(valor);
  const escapado = valor.replace(/"/g, '""');
  return precisaAspas ? `"${escapado}"` : escapado;
}

/** CSV com separador ponto e vírgula e quebra CRLF — abre direto no Excel brasileiro. */
export function gerarCsv(inscritos: Inscrito[]): string {
  const linhas = linhasRelatorio(ordenarParaRelatorio(inscritos)).map((l) =>
    l.map(celula).join(SEPARADOR),
  );
  const cabecalho = COLUNAS_RELATORIO.map(celula).join(SEPARADOR);
  return [cabecalho, ...linhas].join("\r\n") + "\r\n";
}

/** Dispara o download com BOM UTF-8 (para acentos corretos no Excel). */
export function baixarCsv(inscritos: Inscrito[]): string {
  const nome = `${nomeArquivo("inscritos")}.csv`;
  // O "﻿" é o BOM: sem ele o Excel em português abre os acentos errados.
  const blob = new Blob(["﻿", gerarCsv(inscritos)], { type: "text/csv;charset=utf-8" });
  baixarArquivo(blob, nome);
  return nome;
}
