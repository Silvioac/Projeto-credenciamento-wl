"use client";

import { useConexao } from "@/hooks/useConexao";
import { sincronizarFila } from "@/lib/fila/fila";

/** Indicador online / offline / N pendentes. Clique força uma sincronização. */
export function StatusConexao() {
  const { online, pendentes, sincronizando } = useConexao();

  let texto: string;
  let classe: string;
  let ponto: string;
  if (!online) {
    texto = pendentes > 0 ? `Offline · ${pendentes} pendente${pendentes > 1 ? "s" : ""}` : "Offline";
    classe = "bg-alerta-suave text-alerta";
    ponto = "bg-alerta";
  } else if (pendentes > 0) {
    texto = sincronizando
      ? `Enviando ${pendentes}…`
      : `${pendentes} pendente${pendentes > 1 ? "s" : ""}`;
    classe = "bg-alerta-suave text-alerta";
    ponto = "bg-alerta";
  } else {
    texto = "Online";
    classe = "bg-ok-suave text-ok";
    ponto = "bg-ok";
  }

  return (
    <button
      type="button"
      onClick={() => void sincronizarFila()}
      title="Clique para sincronizar agora"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${classe}`}
    >
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${ponto} ${sincronizando ? "animate-pulse" : ""}`}
      />
      {texto}
    </button>
  );
}
