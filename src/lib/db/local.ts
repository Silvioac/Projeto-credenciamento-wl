"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Inscrito, NovoInscrito } from "@/lib/tipos";

/** Operação pendente de envio ao servidor. */
export type Operacao = {
  /** UUID da operação — garante idempotência entre reenvios. */
  id: string;
  criadaEm: number;
  tentativas: number;
  proximaTentativa: number;
  ultimoErro?: string;
} & (
  | { tipo: "inscricao"; dados: NovoInscrito }
  | { tipo: "porta"; dados: NovoInscrito }
  | { tipo: "checkin"; codigo: string; horaEntrada: string }
);

interface EsquemaLocal extends DBSchema {
  fila: {
    key: string;
    value: Operacao;
    indexes: { "por-criacao": number };
  };
  inscritos: {
    key: string;
    value: Inscrito;
  };
  meta: {
    key: string;
    value: { chave: string; valor: unknown };
  };
}

const NOME_BANCO = "credenciamento";
const VERSAO = 1;

let promessa: Promise<IDBPDatabase<EsquemaLocal>> | null = null;

export function bancoLocal(): Promise<IDBPDatabase<EsquemaLocal>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponível neste navegador."));
  }
  if (!promessa) {
    promessa = openDB<EsquemaLocal>(NOME_BANCO, VERSAO, {
      upgrade(db) {
        const fila = db.createObjectStore("fila", { keyPath: "id" });
        fila.createIndex("por-criacao", "criadaEm");
        db.createObjectStore("inscritos", { keyPath: "codigo" });
        db.createObjectStore("meta", { keyPath: "chave" });
      },
    });
  }
  return promessa;
}

/* ---------- fila ---------- */

export async function guardarOperacao(op: Operacao): Promise<void> {
  const db = await bancoLocal();
  await db.put("fila", op);
}

export async function removerOperacao(id: string): Promise<void> {
  const db = await bancoLocal();
  await db.delete("fila", id);
}

export async function listarOperacoes(): Promise<Operacao[]> {
  const db = await bancoLocal();
  return db.getAllFromIndex("fila", "por-criacao");
}

export async function contarOperacoes(): Promise<number> {
  const db = await bancoLocal();
  return db.count("fila");
}

/* ---------- cache de inscritos ---------- */

export async function substituirCacheInscritos(lista: Inscrito[]): Promise<void> {
  const db = await bancoLocal();
  const tx = db.transaction(["inscritos", "meta"], "readwrite");
  await tx.objectStore("inscritos").clear();
  const loja = tx.objectStore("inscritos");
  for (const i of lista) loja.put(i);
  tx.objectStore("meta").put({ chave: "cacheAtualizadoEm", valor: Date.now() });
  await tx.done;
}

export async function lerCacheInscritos(): Promise<Inscrito[]> {
  const db = await bancoLocal();
  return db.getAll("inscritos");
}

export async function lerInscritoCache(codigo: string): Promise<Inscrito | undefined> {
  const db = await bancoLocal();
  return db.get("inscritos", codigo);
}

export async function gravarInscritoCache(inscrito: Inscrito): Promise<void> {
  const db = await bancoLocal();
  await db.put("inscritos", inscrito);
}

export async function lerMeta<T>(chave: string): Promise<T | undefined> {
  const db = await bancoLocal();
  const r = await db.get("meta", chave);
  return r?.valor as T | undefined;
}
