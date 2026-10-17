"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Botao } from "@/components/ui/Botao";
import { useToast } from "@/components/ui/Toast";
import { apenasDigitos, formatarHora } from "@/lib/formato";
import { mensagemDeErro } from "@/lib/rede";
import {
  indiceAleatorio,
  listarSorteio,
  marcarSorteado,
  zerarSorteio,
  type ParticipanteSorteio,
} from "@/lib/sorteio";

const ATUALIZAR_MS = 3000;
const GIRO_MS = 3500;

/** No telão só aparecem os 4 últimos dígitos do telefone (LGPD). */
const finalTelefone = (t: string) => `final ${apenasDigitos(t).slice(-4)}`;

const semAssinatura = () => () => {};
const linkNoNavegador = () => `${window.location.origin}/sorteio`;
const linkNoServidor = () => "";

/** Aba do telão: QR para entrar, contador ao vivo e o sorteio. */
export function Sorteio() {
  const toast = useToast();
  const telaRef = useRef<HTMLDivElement>(null);
  const [lista, setLista] = useState<ParticipanteSorteio[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [girando, setGirando] = useState(false);
  const [nomeNaTela, setNomeNaTela] = useState<string | null>(null);
  const [ganhador, setGanhador] = useState<ParticipanteSorteio | null>(null);
  const [zerando, setZerando] = useState(false);
  const link = useSyncExternalStore(semAssinatura, linkNoNavegador, linkNoServidor);

  const atualizar = useCallback(async () => {
    try {
      setLista(await listarSorteio());
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, []);

  useEffect(() => {
    const primeira = setTimeout(() => void atualizar(), 0);
    const id = setInterval(() => void atualizar(), ATUALIZAR_MS);
    return () => {
      clearTimeout(primeira);
      clearInterval(id);
    };
  }, [atualizar]);

  const elegiveis = lista.filter((p) => !p.sorteado_em);
  const ganhadores = lista
    .filter((p) => p.sorteado_em)
    .sort((a, b) => (a.sorteado_em ?? "").localeCompare(b.sorteado_em ?? ""));

  async function sortear() {
    // Sorteia sobre a lista fresca do servidor, não sobre a última leitura.
    let atual: ParticipanteSorteio[];
    try {
      atual = (await listarSorteio()).filter((p) => !p.sorteado_em);
    } catch (e) {
      toast(`Não deu para ler a lista: ${mensagemDeErro(e)}`, "erro");
      return;
    }
    if (atual.length === 0) {
      toast("Ninguém para sortear ainda.", "erro");
      return;
    }
    const escolhido = atual[indiceAleatorio(atual.length)];
    setGanhador(null);
    setGirando(true);
    const inicio = Date.now();
    await new Promise<void>((fim) => {
      const passo = () => {
        const passado = Date.now() - inicio;
        if (passado >= GIRO_MS) return fim();
        setNomeNaTela(atual[Math.floor(Math.random() * atual.length)].nome);
        setTimeout(passo, 60 + (passado / GIRO_MS) * 240); // desacelera
      };
      passo();
    });
    setNomeNaTela(escolhido.nome);
    setGanhador(escolhido);
    setGirando(false);
    try {
      await marcarSorteado(escolhido.id);
      void atualizar();
    } catch (e) {
      toast(`Ganhador não foi gravado: ${mensagemDeErro(e)}. Anote: ${escolhido.nome}.`, "erro");
    }
  }

  async function zerar() {
    if (!window.confirm("Apagar TODOS os participantes do sorteio? Os inscritos do evento não são afetados.")) return;
    setZerando(true);
    try {
      await zerarSorteio();
      setGanhador(null);
      setNomeNaTela(null);
      await atualizar();
      toast("Sorteio zerado.", "ok");
    } catch (e) {
      toast(`Falha ao zerar: ${mensagemDeErro(e)}`, "erro");
    } finally {
      setZerando(false);
    }
  }

  function telaCheia() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void telaRef.current?.requestFullscreen?.();
  }

  return (
    <div>
      <div ref={telaRef} className="overflow-auto rounded-cartao bg-azul-noite p-6 text-white sm:p-10">
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="mx-auto text-center">
            <div className="rounded-2xl bg-white p-4">
              {link ? <QRCodeSVG value={link} size={260} level="M" className="h-auto w-[min(260px,60vw)]" /> : null}
            </div>
            <p className="mt-3 text-[15px] font-bold">Aponte a câmera e participe!</p>
            <p className="mt-1 break-all text-[13px] text-azul-claro">{link.replace(/^https?:\/\//, "")}</p>
          </div>

          <div className="min-w-0 text-center">
            <h2 className="text-[clamp(26px,4vw,48px)] font-extrabold leading-tight">Sorteio ao vivo</h2>
            <p className="mt-2 text-[clamp(16px,2vw,24px)] text-azul-claro">
              <strong className="text-white">{elegiveis.length}</strong>{" "}
              {elegiveis.length === 1 ? "pessoa concorrendo" : "pessoas concorrendo"}
            </p>

            <div
              className="mt-6 flex min-h-[150px] flex-col items-center justify-center rounded-2xl bg-white/10 px-4 py-6"
              aria-live="polite"
            >
              {nomeNaTela ? (
                <>
                  {ganhador && !girando ? (
                    <div className="mb-1 text-[clamp(14px,1.6vw,20px)] font-bold uppercase tracking-widest text-azul-claro">
                      🎉 Ganhador(a) 🎉
                    </div>
                  ) : null}
                  <div
                    className={`break-words text-[clamp(28px,5vw,64px)] font-extrabold leading-tight ${girando ? "opacity-80" : ""}`}
                  >
                    {nomeNaTela}
                  </div>
                  {ganhador && !girando ? (
                    <div className="mt-1 text-[clamp(14px,1.6vw,20px)] text-azul-claro">
                      Telefone {finalTelefone(ganhador.telefone)}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-[clamp(16px,2vw,24px)] text-azul-claro">Quem será o(a) sortudo(a)?</div>
              )}
            </div>

            <div className="mx-auto mt-6 grid max-w-[420px] gap-2">
              <Botao
                type="button"
                variante="claro"
                carregando={girando}
                disabled={girando || zerando}
                onClick={() => void sortear()}
                className="text-[18px]"
              >
                {girando ? "Sorteando…" : ganhador ? "🎲 Sortear de novo" : "🎲 Sortear"}
              </Botao>
              <button
                type="button"
                onClick={telaCheia}
                className="min-h-10 text-[13px] font-semibold text-azul-claro hover:text-white"
              >
                ⛶ Tela cheia (telão)
              </button>
            </div>
          </div>
        </div>

        {ganhadores.length > 0 ? (
          <div className="mt-8 border-t border-white/15 pt-4">
            <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-azul-claro">Já sorteados</h3>
            <ol className="grid gap-1 text-[15px] sm:grid-cols-2">
              {ganhadores.map((g, i) => (
                <li key={g.id}>
                  {i + 1}. <strong>{g.nome}</strong>{" "}
                  <span className="text-azul-claro">
                    · {finalTelefone(g.telefone)} · {formatarHora(g.sorteado_em)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      {erro ? (
        <p className="mt-3 text-[13px] text-erro">Sem conexão com o servidor: {erro}. Tentando de novo a cada 3 s.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-tinta-2">
        <span className="min-w-0 flex-1">
          A lista atualiza a cada 3 s. Quem já foi sorteado não concorre de novo. O telefone completo dos ganhadores
          fica na tabela sorteio do Supabase.
        </span>
        <Botao type="button" variante="linha" largura="auto" carregando={zerando} disabled={girando} onClick={() => void zerar()}>
          Zerar sorteio
        </Botao>
      </div>
    </div>
  );
}
