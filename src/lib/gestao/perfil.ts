"use client";

import { useEffect, useSyncExternalStore } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";

export type Perfil = "recepcao" | "admin";

export interface EstadoPerfil {
  perfil: Perfil;
  /** true enquanto ainda não confirmamos o perfil com o servidor. */
  carregando: boolean;
  email: string;
}

export const NOME_PERFIL: Record<Perfil, string> = {
  recepcao: "Recepção",
  admin: "Administrativo",
};

const CHAVE_CACHE = "credenciamento:perfil";

/*
 * O perfil guardado aqui vale como dica de interface. A trava de verdade está
 * no banco: um gatilho impede que o perfil recepção altere cadastro ou desfaça
 * entrada. Na dúvida assumimos 'recepcao', que é o menos privilegiado.
 */
let estado: EstadoPerfil = { perfil: "recepcao", carregando: true, email: "" };
const ESTADO_SERVIDOR: EstadoPerfil = { perfil: "recepcao", carregando: true, email: "" };
const ouvintes = new Set<() => void>();

function definir(parcial: Partial<EstadoPerfil>) {
  const novo = { ...estado, ...parcial };
  if (novo.perfil === estado.perfil && novo.carregando === estado.carregando && novo.email === estado.email) {
    return;
  }
  estado = novo;
  for (const cb of ouvintes) cb();
}

function assinar(cb: () => void) {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

const ler = () => estado;
const lerNoServidor = () => ESTADO_SERVIDOR;

function lerCache(): Perfil | null {
  try {
    const v = localStorage.getItem(CHAVE_CACHE);
    return v === "admin" || v === "recepcao" ? v : null;
  } catch {
    return null;
  }
}

export function limparCachePerfil() {
  try {
    localStorage.removeItem(CHAVE_CACHE);
  } catch {
    // modo privado: nada a limpar
  }
  estado = { perfil: "recepcao", carregando: true, email: "" };
}

/** Lê o cache local e confirma com o servidor. Seguro chamar várias vezes. */
export async function carregarPerfil(): Promise<void> {
  const doCache = lerCache();
  if (doCache) definir({ perfil: doCache });

  const sb = supabaseNavegador();
  const { data: sessao } = await sb.auth.getSession();
  const usuario = sessao.session?.user;
  if (!usuario) {
    definir({ carregando: false });
    return;
  }
  definir({ email: usuario.email ?? "" });

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    definir({ carregando: false });
    return;
  }
  const { data, error } = await sb.from("perfis").select("perfil").eq("usuario_id", usuario.id).maybeSingle();
  if (error) {
    definir({ carregando: false }); // falha de rede: fica com o cache
    return;
  }
  const valor: Perfil = data?.perfil === "admin" ? "admin" : "recepcao";
  try {
    localStorage.setItem(CHAVE_CACHE, valor);
  } catch {
    // segue sem cache
  }
  definir({ perfil: valor, carregando: false });
}

export interface PermissoesPerfil extends EstadoPerfil {
  podeVerPainel: boolean;
  podeExportar: boolean;
}

export function usePerfil(): PermissoesPerfil {
  const atual = useSyncExternalStore(assinar, ler, lerNoServidor);

  useEffect(() => {
    void carregarPerfil();
    const aoVoltarOnline = () => void carregarPerfil();
    window.addEventListener("online", aoVoltarOnline);
    return () => window.removeEventListener("online", aoVoltarOnline);
  }, []);

  return {
    ...atual,
    podeVerPainel: atual.perfil === "admin",
    podeExportar: atual.perfil === "admin",
  };
}
