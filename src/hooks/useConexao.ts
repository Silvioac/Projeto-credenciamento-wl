"use client";

import { useSyncExternalStore } from "react";
import { assinarFila, estadoAtualFila, type EstadoFila } from "@/lib/fila/fila";

export interface Conexao extends EstadoFila {
  online: boolean;
}

function assinarOnline(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

const lerOnline = () => navigator.onLine;
const lerOnlineServidor = () => true;

/** Status online/offline do navegador + estado da fila de operações pendentes. */
export function useConexao(): Conexao {
  const online = useSyncExternalStore(assinarOnline, lerOnline, lerOnlineServidor);
  const fila = useSyncExternalStore(assinarFila, estadoAtualFila, estadoAtualFila);
  return { online, ...fila };
}
