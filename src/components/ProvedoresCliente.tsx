"use client";

import { useEffect, type ReactNode } from "react";
import { ProvedorToast, useToast } from "@/components/ui/Toast";
import { iniciarSincronizacaoAutomatica } from "@/lib/fila/fila";

/** Liga a sincronização automática da fila offline (evento online, intervalo, SW). */
function SincronizadorFila() {
  useEffect(() => iniciarSincronizacaoAutomatica(), []);
  return null;
}

/** Registra o service worker e avisa quando há versão nova. */
function RegistroServiceWorker() {
  const toast = useToast();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelado = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const novo = reg.installing;
          if (!novo) return;
          novo.addEventListener("statechange", () => {
            if (!cancelado && novo.state === "installed" && navigator.serviceWorker.controller) {
              toast("Nova versão disponível. Recarregue a página quando puder.", "info");
            }
          });
        });
      })
      .catch(() => {
        // Sem service worker o app continua funcionando online.
      });
    return () => {
      cancelado = true;
    };
  }, [toast]);
  return null;
}

export function ProvedoresCliente({ children }: { children: ReactNode }) {
  return (
    <ProvedorToast>
      <SincronizadorFila />
      <RegistroServiceWorker />
      {children}
    </ProvedorToast>
  );
}
