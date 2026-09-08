import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/tipos";
import { credenciaisSupabase } from "./env";

/**
 * Cliente Supabase para Server Components e Route Handlers.
 * Crie um por requisição — nunca compartilhe entre requisições.
 */
export async function supabaseServidor() {
  const { url, chave } = credenciaisSupabase();
  const armazem = await cookies();
  return createServerClient<Database>(url, chave, {
    cookies: {
      getAll() {
        return armazem.getAll();
      },
      setAll(lista) {
        try {
          for (const { name, value, options } of lista) {
            armazem.set(name, value, options);
          }
        } catch {
          // Em Server Components não é possível gravar cookies; o proxy cuida da renovação.
        }
      },
    },
  });
}
