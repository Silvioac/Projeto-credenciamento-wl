"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type TipoToast = "ok" | "erro" | "info";

interface Toast {
  id: number;
  mensagem: string;
  tipo: TipoToast;
}

type Mostrar = (mensagem: string, tipo?: TipoToast) => void;

const Contexto = createContext<Mostrar>(() => {});

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const contador = useRef(0);

  const mostrar = useCallback<Mostrar>((mensagem, tipo = "info") => {
    contador.current += 1;
    setToast({ id: contador.current, mensagem, tipo });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tipo === "erro" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const cor =
    toast?.tipo === "ok" ? "bg-ok" : toast?.tipo === "erro" ? "bg-erro" : "bg-grafite";

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`nao-imprimir pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-[10px] px-5 py-3 text-center text-sm font-medium text-white shadow-lg transition-all duration-300 ${cor} ${
          toast ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        {toast?.mensagem}
      </div>
    </Contexto.Provider>
  );
}

export function useToast(): Mostrar {
  return useContext(Contexto);
}
