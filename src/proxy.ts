import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { evento } from "@/config/evento";
import { credenciaisSupabase } from "@/lib/supabase/env";

const LOGIN = "/gestao/login";

/**
 * Protege /gestao: renova a sessão Supabase nos cookies e redireciona
 * quem não está logado para o login (e quem está logado, para fora do login).
 */
export async function proxy(request: NextRequest) {
  // Site desligado entre edições: nada chega ao banco, nem a gestão.
  if (!evento.siteAtivo) return foraDoAr();
  if (!request.nextUrl.pathname.startsWith("/gestao")) return NextResponse.next();

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

function foraDoAr() {
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Fora do ar</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#F3F6FA;color:#232323;text-align:center;padding:24px"><div><h1 style="color:#1E5B94;font-size:22px;margin:0 0 8px">Este site está fora do ar</h1><p style="margin:0;color:#555">O ${evento.nome} já aconteceu. Obrigado pela participação!</p><p style="margin:24px 0 0;font-size:12px;color:#888">Sistema desenvolvido por ${evento.desenvolvedor.nome}</p></div></body></html>`;
  return new NextResponse(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Com o site no ar, só /gestao passa pela sessão; desligado, tudo (menos os
// arquivos estáticos do build) recebe a página de fora do ar.
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
