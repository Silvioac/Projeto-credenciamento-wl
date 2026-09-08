"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/tipos";
import { credenciaisSupabase } from "./env";

let instancia: SupabaseClient<Database> | null = null;

/**
 * Cliente Supabase do navegador (singleton). Usa cookies para a sessão,
 * assim o proxy do servidor enxerga o mesmo login.
 */
export function supabaseNavegador(): SupabaseClient<Database> {
  if (instancia) return instancia;
  const { url, chave } = credenciaisSupabase();
  instancia = createBrowserClient<Database>(url, chave);
  return instancia;
}
