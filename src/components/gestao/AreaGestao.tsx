"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { StatusConexao } from "@/components/StatusConexao";
import { useBaseInscritos } from "@/lib/gestao/base";
import { NOME_PERFIL, limparCachePerfil, usePerfil } from "@/lib/gestao/perfil";
import { supabaseNavegador } from "@/lib/supabase/client";
import { Painel } from "./Painel";
import { Recepcao } from "./Recepcao";

type Aba = "recepcao" | "painel";

const lerAba = (): Aba => (window.location.hash === "#painel" ? "painel" : "recepcao");
const lerAbaServidor = (): Aba => "recepcao";
function assinarHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

type Sessao = { estado: "verificando" } | { estado: "ok"; email: string } | { estado: "sem_sessao" };

export function AreaGestao() {
  const router = useRouter();
  const abaNaUrl = useSyncExternalStore(assinarHash, lerAba, lerAbaServidor);
  const [sessao, setSessao] = useState<Sessao>({ estado: "verificando" });
  const base = useBaseInscritos();
  const perfil = usePerfil();

  // Quem é da recepção não tem o Painel: qualquer tentativa volta para a Recepção.
  const aba: Aba = abaNaUrl === "painel" && perfil.podeVerPainel ? "painel" : "recepcao";

  useEffect(() => {
    const sb = supabaseNavegador();
    let ativo = true;
    void sb.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      if (data.session?.user) {
        setSessao({ estado: "ok", email: data.session.user.email ?? "" });
      } else {
        setSessao({ estado: "sem_sessao" });
        if (navigator.onLine) router.replace("/gestao/login");
      }
    });
    const { data: ouvinte } = sb.auth.onAuthStateChange((_evento, s) => {
      if (!ativo) return;
      if (s?.user) setSessao({ estado: "ok", email: s.user.email ?? "" });
    });
    return () => {
      ativo = false;
      ouvinte.subscription.unsubscribe();
    };
  }, [router]);

  function trocar(nova: Aba) {
    window.history.pushState(null, "", `#${nova}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  async function sair() {
    limparCachePerfil();
    await supabaseNavegador().auth.signOut();
    router.replace("/gestao/login");
    router.refresh();
  }

  const abas: Array<[Aba, string]> = perfil.podeVerPainel
    ? [
        ["recepcao", "Recepção"],
        ["painel", "Painel"],
      ]
    : [["recepcao", "Recepção"]];

  return (
    <>
      <Cabecalho
        acoes={
          <>
            <StatusConexao />
            {sessao.estado === "ok" ? (
              <>
                <span
                  className="hidden rounded-full bg-azul-suave px-2.5 py-1 text-[11px] font-bold text-azul-escuro sm:inline"
                  title={sessao.email}
                >
                  {NOME_PERFIL[perfil.perfil]}
                </span>
                <button
                  type="button"
                  onClick={() => void sair()}
                  className="rounded-full border border-linha px-2.5 py-1 text-[11px] font-bold text-tinta-2 hover:border-azul hover:text-azul-escuro"
                  title={sessao.email}
                >
                  Sair
                </button>
              </>
            ) : null}
          </>
        }
      />
      {abas.length > 1 ? (
        <nav className="nao-imprimir bg-azul-escuro" aria-label="Seções da gestão">
          <div className="mx-auto flex max-w-[1040px] gap-0.5 px-4">
            {abas.map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                onClick={() => trocar(chave)}
                aria-current={aba === chave ? "page" : undefined}
                className={`flex-1 border-b-[3px] px-4 py-3 text-[13.5px] font-semibold sm:flex-none ${
                  aba === chave ? "border-white text-white" : "border-transparent text-azul-claro hover:text-white"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </nav>
      ) : (
        <div className="nao-imprimir bg-azul-escuro px-4 py-3">
          <div className="mx-auto max-w-[1040px] text-[13.5px] font-semibold text-white">Recepção</div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-14 pt-5">
        {sessao.estado === "sem_sessao" ? (
          <div className="rounded-cartao border border-alerta/30 bg-alerta-suave p-5 text-[13.5px] text-alerta">
            Sem sessão ativa neste aparelho. Conecte-se à internet e faça login em /gestao/login.
          </div>
        ) : aba === "recepcao" ? (
          <Recepcao base={base} />
        ) : (
          <Painel base={base} podeExportar={perfil.podeExportar} />
        )}
      </main>
    </>
  );
}
