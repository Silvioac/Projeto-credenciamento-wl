"use client";

import { useEffect } from "react";
import { formatarHora } from "@/lib/formato";
import type { ResultadoRecepcao } from "@/lib/gestao/acoes";

interface Props {
  resultado: ResultadoRecepcao | null;
  aoFechar: () => void;
  duracaoMs?: number;
}

/** Confirmação grande, para a recepcionista conferir de relance. */
export function ConfirmacaoCheckin({ resultado, aoFechar, duracaoMs = 2800 }: Props) {
  useEffect(() => {
    if (!resultado) return;
    const t = setTimeout(aoFechar, duracaoMs);
    return () => clearTimeout(t);
  }, [resultado, aoFechar, duracaoMs]);

  if (!resultado) return null;

  let cor: string;
  let icone: string;
  let titulo: string;
  let nome: string;
  let detalhe: string;

  if (resultado.status === "ok") {
    cor = "bg-ok";
    icone = "✓";
    titulo = resultado.pendente ? "Entrada registrada (será enviada)" : "Entrada confirmada";
    nome = resultado.inscrito.nome;
    detalhe = `${resultado.inscrito.codigo} · ${resultado.inscrito.profissao}`;
  } else if (resultado.status === "ja_registrado") {
    cor = "bg-alerta";
    icone = "!";
    titulo = `Já registrado às ${formatarHora(resultado.inscrito.hora_entrada)}`;
    nome = resultado.inscrito.nome;
    detalhe = `${resultado.inscrito.codigo} · ${resultado.inscrito.profissao}`;
  } else {
    cor = "bg-erro";
    icone = "✕";
    titulo = "Código não encontrado";
    nome = resultado.codigo;
    detalhe = resultado.offline
      ? "Sem conexão e este código não está na base local. Use o cadastro rápido."
      : "Confira o código ou use o cadastro rápido na porta.";
  }

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={titulo}
      onClick={aoFechar}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
    >
      <div className={`w-full max-w-[420px] rounded-[18px] ${cor} p-7 text-center text-white shadow-2xl`}>
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-4xl font-black">
          {icone}
        </div>
        <div className="text-[15px] font-bold uppercase tracking-wide opacity-90">{titulo}</div>
        <div className="mt-2 break-words text-[28px] font-extrabold leading-tight">{nome}</div>
        <div className="mt-1.5 text-[14px] opacity-90">{detalhe}</div>
        <div className="mt-4 text-[11px] opacity-70">Toque para fechar</div>
      </div>
    </div>
  );
}
