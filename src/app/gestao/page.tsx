import type { Metadata } from "next";
import { AreaGestao } from "@/components/gestao/AreaGestao";

export const metadata: Metadata = {
  title: "Recepção e painel",
  robots: { index: false, follow: false },
};

/**
 * Página estática (sem leitura de cookies no servidor) para que o service worker
 * consiga servi-la offline. A proteção fica no proxy.ts e na checagem do cliente.
 */
export default function PaginaGestao() {
  return <AreaGestao />;
}
