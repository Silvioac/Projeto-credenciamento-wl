import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { credenciaisSupabase } from "@/lib/supabase/env";

const LOGIN = "/gestao/login";

/**
 * Protege /gestao: renova a sessão Supabase nos cookies e redireciona
 * quem não está logado para o login (e quem está logado, para fora do login).
 */
export async function proxy(request: NextRequest) {
  const { url, chave } = credenciaisSupabase();
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lista) {
        for (const { name, value } of lista) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, options);
      },
    },
  });

  // getClaims valida o JWT localmente (sem ida ao servidor a cada requisição).
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const caminho = request.nextUrl.pathname;

  if (!logado && caminho !== LOGIN) {
    const destino = request.nextUrl.clone();
    destino.pathname = LOGIN;
    destino.search = caminho !== "/gestao" ? `?voltar=${encodeURIComponent(caminho)}` : "";
    return NextResponse.redirect(destino);
  }
  if (logado && caminho === LOGIN) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/gestao";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return resposta;
}

export const config = {
  matcher: ["/gestao/:path*"],
};
