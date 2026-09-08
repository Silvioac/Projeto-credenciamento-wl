import { evento } from "@/config/evento";
import { formatarDataHora } from "./formato";
import type { Inscrito } from "./tipos";

const SEPARADOR = ";";

function celula(valor: string): string {
  const precisaAspas = /[";\n\r]/.test(valor);
  const escapado = valor.replace(/"/g, '""');
  return precisaAspas ? `"${escapado}"` : escapado;
}

/** Gera o CSV completo (todas as colunas), separador ; e quebra CRLF — abre direto no Excel brasileiro. */
export function gerarCsv(inscritos: Inscrito[]): string {
  const cabecalho = [
    "Código",
    "Nome",
    "Telefone",
    "Profissão",
    "E-mail",
    "Presente",
    "Hora de entrada",
    "Origem",
    "Data da inscrição",
    "ID",
  ];
  const linhas = inscritos.map((i) =>
    [
      i.codigo,
      i.nome,
      i.telefone,
      i.profissao,
      i.email,
      i.presente ? "Sim" : "Não",
      i.hora_entrada ? formatarDataHora(i.hora_entrada) : "",
      i.origem === "porta" ? "Cadastro na porta" : "Inscrição online",
      formatarDataHora(i.criado_em),
      i.id,
    ]
      .map(celula)
      .join(SEPARADOR),
  );
  return [cabecalho.map(celula).join(SEPARADOR), ...linhas].join("\r\n") + "\r\n";
}

function carimbo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Dispara o download com BOM UTF-8 (para acentos corretos no Excel). */
export function baixarCsv(inscritos: Inscrito[]): string {
  const nomeArquivo = `inscritos-${evento.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${carimbo()}.csv`;
  const blob = new Blob(["﻿", gerarCsv(inscritos)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return nomeArquivo;
}
