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
import { buscarMudancasDesde, buscarTodosInscritos } from "@/lib/inscricoes";
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

/** Consulta incremental (só o que mudou) — barata, roda sempre, com ou sem Realtime. */
const INTERVALO_INCREMENTAL_MS = 10_000;
/** Recarga completa de segurança (cobre relógio errado em algum aparelho, exclusões etc.). */
const INTERVALO_COMPLETO_MS = 5 * 60_000;
/** Margem para não perder linhas gravadas no mesmo instante da última consulta. */
const MARGEM_MS = 5_000;

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
      const criado = op.dados.criado_em ?? new Date(op.criadaEm).toISOString();
      mapa.set(op.dados.codigo, { id: op.id, criado_em: criado, atualizado_em: criado, ...op.dados });
    }
  }
  return [...mapa.values()];
}

/** Maior `atualizado_em` de uma lista (marca d'água da sincronização incremental). */
function marcaDagua(lista: Inscrito[]): string | null {
  let maior: string | null = null;
  for (const i of lista) if (!maior || i.atualizado_em > maior) maior = i.atualizado_em;
  return maior;
}

export function useBaseInscritos(): BaseInscritos {
  const [mapa, setMapa] = useState<Map<string, Inscrito>>(() => new Map());
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [realtimeAtivo, setRealtimeAtivo] = useState(false);
  const emAndamento = useRef(false);
  const marca = useRef<string | null>(null);
  const ultimaCompleta = useRef(0);

  const mesclar = useCallback((linhas: Inscrito[]) => {
    if (linhas.length === 0) return;
    setMapa((m) => {
      const novo = new Map(m);
      for (const l of linhas) {
        const atual = novo.get(l.codigo);
        // Nunca regride um check-in já visto localmente (pode estar na fila de envio).
        if (atual?.presente && !l.presente) continue;
        novo.set(l.codigo, l);
      }
      return novo;
    });
    for (const l of linhas) void gravarInscritoCache(l).catch(() => {});
    const m = marcaDagua(linhas);
    if (m && (!marca.current || m > marca.current)) marca.current = m;
  }, []);

  /** Recarga completa do servidor + sobreposição das operações pendentes. */
  const atualizar = useCallback(async () => {
    if (emAndamento.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    emAndamento.current = true;
    setAtualizando(true);
    try {
      const [servidor, ops] = await Promise.all([buscarTodosInscritos(), listarOperacoes().catch(() => [])]);
      const lista = aplicarPendentes(servidor, ops);
      setMapa(new Map(lista.map((i) => [i.codigo, i])));
      marca.current = marcaDagua(servidor);
      ultimaCompleta.current = Date.now();
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

  /** Só o que mudou desde a última marca (ou completa, se ainda não há marca / passou o prazo). */
  const atualizarIncremental = useCallback(async () => {
    if (emAndamento.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (!marca.current || Date.now() - ultimaCompleta.current > INTERVALO_COMPLETO_MS) {
      await atualizar();
      return;
    }
    emAndamento.current = true;
    try {
      const desde = new Date(new Date(marca.current).getTime() - MARGEM_MS).toISOString();
      const mudancas = await buscarMudancasDesde(desde);
      mesclar(mudancas);
      setAtualizadoEm(Date.now());
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      emAndamento.current = false;
    }
  }, [atualizar, mesclar]);

  const aplicarLocal = useCallback((inscrito: Inscrito) => {
    setMapa((m) => {
      const novo = new Map(m);
      novo.set(inscrito.codigo, inscrito);
      return novo;
    });
    void gravarInscritoCache(inscrito).catch(() => {});
  }, []);

  // 1) cache local imediato → 2) servidor → 3) realtime (após sessão pronta)
  useEffect(() => {
    let ativo = true;
    const sb = supabaseNavegador();
    let canal: RealtimeChannel | null = null;

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

      // O canal precisa entrar já autenticado: antes da sessão o Supabase aplica a RLS como
      // anônimo e não entrega nenhuma mudança.
      const { data } = await sb.auth.getSession();
      if (!ativo || !data.session) return;
      try {
        await sb.realtime.setAuth(data.session.access_token);
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
              mesclar([comoInscrito(payload.new)]);
            },
          )
          .subscribe((status) => {
            if (!ativo) return;
            setRealtimeAtivo(status === "SUBSCRIBED");
          });
      } catch {
        canal = null;
      }
    })();

    const aoVoltarOnline = () => void atualizar();
    const aoFicarVisivel = () => {
      if (document.visibilityState === "visible") void atualizarIncremental();
    };
    window.addEventListener("online", aoVoltarOnline);
    window.addEventListener("focus", aoFicarVisivel);
    document.addEventListener("visibilitychange", aoFicarVisivel);

    // quando a fila termina de enviar, busca a verdade do servidor
    let pendentesAntes = 0;
    const cancelarFila = assinarFila((e) => {
      if (pendentesAntes > 0 && e.pendentes === 0 && !e.sincronizando) void atualizarIncremental();
      pendentesAntes = e.pendentes;
    });

    return () => {
      ativo = false;
      window.removeEventListener("online", aoVoltarOnline);
      window.removeEventListener("focus", aoFicarVisivel);
      document.removeEventListener("visibilitychange", aoFicarVisivel);
      cancelarFila();
      if (canal) void sb.removeChannel(canal);
    };
  }, [atualizar, atualizarIncremental, mesclar]);

  // 4) polling incremental sempre ligado (com Realtime é redundância; sem ele é o caminho principal)
  useEffect(() => {
    const intervalo = setInterval(() => void atualizarIncremental(), INTERVALO_INCREMENTAL_MS);
    return () => clearInterval(intervalo);
  }, [atualizarIncremental]);

  const inscritos = useMemo(() => [...mapa.values()], [mapa]);
  const porCodigo = useCallback((codigo: string) => mapa.get(codigo), [mapa]);

  return { inscritos, carregando, atualizando, atualizadoEm, erro, realtimeAtivo, atualizar, aplicarLocal, porCodigo };
}
