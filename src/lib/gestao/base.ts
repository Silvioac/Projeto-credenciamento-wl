"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  gravarInscritoCache,
  lerCacheInscritos,
  lerMeta,
  listarOperacoes,
  substituirCacheInscritos,
  type Operacao,
} from "@/lib/db/local";
import { buscarTodosInscritos } from "@/lib/inscricoes";
import { assinarFila } from "@/lib/fila/fila";
import { mensagemDeErro } from "@/lib/rede";
import { supabaseNavegador } from "@/lib/supabase/client";
import { comoInscrito, type Database, type Inscrito } from "@/lib/tipos";

type LinhaInscrito = Database["public"]["Tables"]["inscritos"]["Row"];

export interface BaseInscritos {
  inscritos: Inscrito[];
  /** true até a primeira leitura do cache local terminar. */
  carregando: boolean;
  atualizando: boolean;
  atualizadoEm: number | null;
  erro: string | null;
  realtimeAtivo: boolean;
  atualizar: () => Promise<void>;
  /** Aplica uma mudança local imediata (otimista) na lista e no cache. */
  aplicarLocal: (inscrito: Inscrito) => void;
  porCodigo: (codigo: string) => Inscrito | undefined;
}

const INTERVALO_COM_REALTIME_MS = 60_000;
const INTERVALO_SEM_REALTIME_MS = 20_000;

/**
 * Sobrepõe as operações ainda não enviadas à lista vinda do servidor,
 * para a recepção enxergar seus próprios check-ins/cadastros mesmo offline.
 */
export function aplicarPendentes(lista: Inscrito[], ops: Operacao[]): Inscrito[] {
  if (ops.length === 0) return lista;
  const mapa = new Map(lista.map((i) => [i.codigo, i]));
  for (const op of ops) {
    if (op.tipo === "checkin") {
      const atual = mapa.get(op.codigo);
      if (atual && !atual.presente) {
        mapa.set(op.codigo, { ...atual, presente: true, hora_entrada: op.horaEntrada });
      }
    } else if (!mapa.has(op.dados.codigo)) {
      mapa.set(op.dados.codigo, {
        id: op.id,
        criado_em: op.dados.criado_em ?? new Date(op.criadaEm).toISOString(),
        ...op.dados,
      });
    }
  }
  return [...mapa.values()];
}

export function useBaseInscritos(): BaseInscritos {
  const [mapa, setMapa] = useState<Map<string, Inscrito>>(() => new Map());
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [realtimeAtivo, setRealtimeAtivo] = useState(false);
  const emAndamento = useRef(false);

  const atualizar = useCallback(async () => {
    if (emAndamento.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    emAndamento.current = true;
    setAtualizando(true);
    try {
      const [servidor, ops] = await Promise.all([buscarTodosInscritos(), listarOperacoes().catch(() => [])]);
      const lista = aplicarPendentes(servidor, ops);
      setMapa(new Map(lista.map((i) => [i.codigo, i])));
      setAtualizadoEm(Date.now());
      setErro(null);
      await substituirCacheInscritos(lista).catch(() => {});
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      emAndamento.current = false;
      setAtualizando(false);
    }
  }, []);

  const aplicarLocal = useCallback((inscrito: Inscrito) => {
    setMapa((m) => {
      const novo = new Map(m);
      novo.set(inscrito.codigo, inscrito);
      return novo;
    });
    void gravarInscritoCache(inscrito).catch(() => {});
  }, []);

  // 1) cache local imediato, 2) servidor, 3) realtime, 4) polling de segurança
  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const [lista, quando] = await Promise.all([lerCacheInscritos(), lerMeta<number>("cacheAtualizadoEm")]);
        if (!ativo) return;
        if (lista.length) setMapa(new Map(lista.map((i) => [i.codigo, i])));
        if (quando) setAtualizadoEm(quando);
      } catch {
        // sem IndexedDB: segue só com o servidor
      } finally {
        if (ativo) setCarregando(false);
      }
      void atualizar();
    })();

    const sb = supabaseNavegador();
    let canal: RealtimeChannel | null = null;
    try {
      canal = sb
        .channel("inscritos-ao-vivo")
        .on<LinhaInscrito>(
          "postgres_changes",
          { event: "*", schema: "public", table: "inscritos" },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const antigo = payload.old as Partial<LinhaInscrito>;
              if (antigo.codigo) {
                setMapa((m) => {
                  const novo = new Map(m);
                  novo.delete(antigo.codigo as string);
                  return novo;
                });
              }
              return;
            }
            const linha = comoInscrito(payload.new);
            setMapa((m) => {
              const novo = new Map(m);
              novo.set(linha.codigo, linha);
              return novo;
            });
            void gravarInscritoCache(linha).catch(() => {});
          },
        )
        .subscribe((status) => {
          if (!ativo) return;
          setRealtimeAtivo(status === "SUBSCRIBED");
        });
    } catch {
      // Realtime indisponível: o polling abaixo cobre.
      canal = null;
    }

    const aoVoltarOnline = () => void atualizar();
    window.addEventListener("online", aoVoltarOnline);

    // quando a fila termina de enviar, busca a verdade do servidor
    let pendentesAntes = 0;
    const cancelarFila = assinarFila((e) => {
      if (pendentesAntes > 0 && e.pendentes === 0 && !e.sincronizando) void atualizar();
      pendentesAntes = e.pendentes;
    });

    return () => {
      ativo = false;
      window.removeEventListener("online", aoVoltarOnline);
      cancelarFila();
      if (canal) void sb.removeChannel(canal);
    };
  }, [atualizar]);

  // Polling de segurança: mais frequente quando o canal em tempo real cai.
  useEffect(() => {
    const intervalo = setInterval(
      () => {
        if (navigator.onLine) void atualizar();
      },
      realtimeAtivo ? INTERVALO_COM_REALTIME_MS : INTERVALO_SEM_REALTIME_MS,
    );
    return () => clearInterval(intervalo);
  }, [realtimeAtivo, atualizar]);

  const inscritos = useMemo(() => [...mapa.values()], [mapa]);
  const porCodigo = useCallback((codigo: string) => mapa.get(codigo), [mapa]);

  return { inscritos, carregando, atualizando, atualizadoEm, erro, realtimeAtivo, atualizar, aplicarLocal, porCodigo };
}
