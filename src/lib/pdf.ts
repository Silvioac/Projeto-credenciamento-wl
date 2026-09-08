"use client";

import { evento } from "@/config/evento";
import { tema } from "@/config/theme";
import { calcularPainel } from "./gestao/painel";
import {
  COLUNAS_RELATORIO,
  baixarArquivo,
  linhasRelatorio,
  nomeArquivo,
  ordenarParaRelatorio,
} from "./relatorio";
import type { Inscrito } from "./tipos";

/** #RRGGBB -> [r,g,b] aceito pelo jsPDF. */
function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const AZUL = rgb(tema.cores.azulEscuro);
const AZUL_CLARO = rgb(tema.cores.azulSuave);
const TINTA2 = rgb(tema.cores.tinta2);

/**
 * Relatório em PDF: resumo, perfil por profissão e a lista completa.
 * O jsPDF entra por import dinâmico para não pesar na página de inscrição,
 * que é a que o participante abre no celular.
 */
export async function baixarPdf(inscritos: Inscrito[]): Promise<string> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const dados = calcularPainel(inscritos); // o feed de entradas não entra no relatório
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: evento.fusoHorario });

  // ---------- cabeçalho ----------
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, largura, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("Relatório de credenciamento", 14, 11);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`${evento.nome} · ${evento.subtitulo}`, 14, 17);
  doc.text(`${evento.dataTexto} · ${evento.horarioTexto} · ${evento.local}`, 14, 22);
  doc.setFontSize(8);
  doc.text(`Emitido em ${geradoEm}`, largura - 14, 22, { align: "right" });

  // ---------- resumo ----------
  const resumo: Array<[string, string]> = [
    ["Inscritos no total", String(dados.resumo.total)],
    ["Presentes", String(dados.resumo.presentes)],
    ["Comparecimento", `${dados.resumo.taxa}%`],
    ["Cadastros na porta", String(dados.resumo.porta)],
  ];
  const larguraCartao = (largura - 28 - 9) / 4;
  resumo.forEach(([rotulo, valor], i) => {
    const x = 14 + i * (larguraCartao + 3);
    doc.setFillColor(...AZUL_CLARO);
    doc.roundedRect(x, 32, larguraCartao, 18, 2, 2, "F");
    doc.setTextColor(...AZUL);
    doc.setFont("helvetica", "bold").setFontSize(15);
    doc.text(valor, x + larguraCartao / 2, 41, { align: "center" });
    doc.setFont("helvetica", "normal").setFontSize(7);
    doc.setTextColor(...TINTA2);
    doc.text(rotulo, x + larguraCartao / 2, 46.5, { align: "center" });
  });

  // ---------- por profissão ----------
  doc.setTextColor(...AZUL);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Perfil do público por profissão", 14, 60);

  autoTable(doc, {
    startY: 64,
    head: [["Profissão", "Inscritos", "Presentes", "Comparecimento"]],
    body: dados.profissoes.map((p) => [
      p.profissao,
      String(p.total),
      String(p.presentes),
      p.total ? `${Math.round((p.presentes / p.total) * 100)}%` : "0%",
    ]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right", cellWidth: 22 },
      2: { halign: "right", cellWidth: 22 },
      3: { halign: "right", cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
  });

  // ---------- lista completa ----------
  doc.addPage();
  doc.setTextColor(...AZUL);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(`Lista de participantes (${dados.resumo.total})`, 14, 16);

  autoTable(doc, {
    startY: 20,
    head: [[...COLUNAS_RELATORIO]],
    body: linhasRelatorio(ordenarParaRelatorio(inscritos)),
    theme: "striped",
    styles: { fontSize: 6.5, cellPadding: 1.2, overflow: "linebreak" },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: "bold", fontSize: 6.5 },
    alternateRowStyles: { fillColor: [246, 249, 252] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 38 },
      2: { cellWidth: 24 },
      3: { cellWidth: 30 },
      4: { cellWidth: 42 },
      5: { cellWidth: 13, halign: "center" },
      6: { cellWidth: 13, halign: "center" },
      7: { cellWidth: 14, halign: "center" },
      8: { cellWidth: 24 },
    },
    margin: { left: 8, right: 8, top: 14, bottom: 14 },
  });

  // ---------- rodapé em todas as páginas ----------
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    const altura = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal").setFontSize(7);
    doc.setTextColor(...TINTA2);
    doc.text(
      `${evento.nome} · documento com dados pessoais, uso restrito à organização`,
      8,
      altura - 6,
    );
    doc.text(`Página ${p} de ${paginas}`, largura - 8, altura - 6, { align: "right" });
  }

  const nome = `${nomeArquivo("relatorio")}.pdf`;
  baixarArquivo(doc.output("blob"), nome);
  return nome;
}
