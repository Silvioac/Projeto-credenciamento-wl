"use client";

import { useCallback, useMemo, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { useToast } from "@/components/ui/Toast";
import { FormularioInscricao } from "@/components/inscricao/FormularioInscricao";
import { normalizarCodigo } from "@/lib/codigo";
import { formatarHora, iniciais, normalizarBusca, primeiroNome } from "@/lib/formato";
import { cadastrarNaPorta, fazerCheckin, type ResultadoRecepcao } from "@/lib/gestao/acoes";
import type { BaseInscritos } from "@/lib/gestao/base";
import { mensagemDeErro } from "@/lib/rede";
import type { Inscrito } from "@/lib/tipos";
import type { DadosInscricao } from "@/lib/validacao";
import { ConfirmacaoCheckin } from "./ConfirmacaoCheckin";
import { LeitorQR } from "./LeitorQR";

const LIMITE_LISTA = 40;

function ItemInscrito({ inscrito, aoConfirmar, ocupado }: { inscrito: Inscrito; aoConfirmar: () => void; ocupado: boolean }) {
  return (
    <li className="mb-2 flex items-center gap-3 rounded-xl border border-linha bg-white px-3.5 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-azul-suave text-[14px] font-bold text-azul-escuro">
        {iniciais(inscrito.nome)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold">{inscrito.nome}</div>
        <div className="truncate text-[12px] text-tinta-2">
          {inscrito.codigo} · {inscrito.profissao}
          {inscrito.origem === "porta" ? " · porta" : ""}
        </div>
      </div>
      {inscrito.presente ? (
        <span className="shrink-0 rounded-full bg-ok-suave px-2.5 py-1 text-[11px] font-bold text-ok">
          Presente · {formatarHora(inscrito.hora_entrada)}
        </span>
      ) : (
        <button
          type="button"
          onClick={aoConfirmar}
          disabled={ocupado}
          className="shrink-0 rounded-[9px] bg-azul-escuro px-3 py-2 text-[12.5px] font-bold text-white hover:bg-azul-noite disabled:opacity-60"
        >
          Confirmar entrada
        </button>
      )}
    </li>
  );
}

export function Recepcao({ base }: { base: BaseInscritos }) {
  const toast = useToast();
  const [busca, setBusca] = useState("");
  const [camera, setCamera] = useState(false);
  const [confirmacao, setConfirmacao] = useState<ResultadoRecepcao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [enviandoPorta, setEnviandoPorta] = useState(false);
  const [erroPorta, setErroPorta] = useState<string | null>(null);

  const resultados = useMemo(() => {
    const termo = normalizarBusca(busca);
    const lista = [...base.inscritos].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    if (!termo) return lista.slice(0, LIMITE_LISTA);
    const codigo = normalizarCodigo(busca);
    const filtrada = lista.filter(
      (i) =>
        (codigo && i.codigo === codigo) ||
        i.codigo.toLowerCase().includes(termo) ||
        normalizarBusca(i.nome).includes(termo) ||
        normalizarBusca(i.email).includes(termo),
    );
    // Código exato primeiro
    filtrada.sort((a, b) => Number(b.codigo === codigo) - Number(a.codigo === codigo));
    return filtrada.slice(0, LIMITE_LISTA);
  }, [busca, base.inscritos]);

  const confirmar = useCallback(
    async (codigo: string) => {
      if (ocupado) return;
      setOcupado(true);
      try {
        const r = await fazerCheckin(codigo, base);
        setConfirmacao(r);
        if (r.status === "ok") {
          toast(`${primeiroNome(r.inscrito.nome)} — entrada confirmada${r.pendente ? " (envio pendente)" : ""}`, "ok");
        }
      } catch (e) {
        toast(mensagemDeErro(e), "erro");
      } finally {
        setOcupado(false);
      }
    },
    [base, ocupado, toast],
  );

  async function buscarEnter() {
    const codigo = normalizarCodigo(busca);
    if (codigo) {
      await confirmar(codigo);
      setBusca("");
    }
  }

  async function porta(dados: DadosInscricao) {
    setErroPorta(null);
    setEnviandoPorta(true);
    try {
      const { inscrito, pendente } = await cadastrarNaPorta(dados, base);
      toast(`${primeiroNome(inscrito.nome)} — cadastrado e presente${pendente ? " (envio pendente)" : ""}`, "ok");
      setConfirmacao({ status: "ok", inscrito, pendente });
    } catch (e) {
      setErroPorta(`${mensagemDeErro(e)} Nada foi perdido: tente novamente.`);
    } finally {
      setEnviandoPorta(false);
    }
  }

  const fecharConfirmacao = useCallback(() => setConfirmacao(null), []);

  return (
    <>
      <ConfirmacaoCheckin resultado={confirmacao} aoFechar={fecharConfirmacao} />
      <div className="grid gap-3.5 md:grid-cols-2">
        <section className="rounded-cartao border border-linha bg-superficie p-5">
          <h1 className="mb-1 text-[22px] font-bold text-azul-escuro">Check-in de participantes</h1>
          <p className="mb-4 text-[13.5px] text-tinta-2">
            Leia o QR code da credencial ou busque pelo nome, e-mail ou código.
          </p>

          {camera ? (
            <div className="mb-4">
              <LeitorQR aoLer={confirmar} pausado={confirmacao !== null || ocupado} aoFechar={() => setCamera(false)} />
            </div>
          ) : (
            <Botao type="button" variante="claro" className="mb-3.5" onClick={() => setCamera(true)}>
              📷 Ler QR code pela câmera
            </Botao>
          )}

          <div className="mb-3.5">
            <label htmlFor="busca" className="sr-only">
              Buscar participante
            </label>
            <input
              id="busca"
              type="search"
              autoComplete="off"
              placeholder="Nome, e-mail ou código (ex.: WL-A1B2C3)"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void buscarEnter();
              }}
              className="w-full rounded-[10px] border-[1.5px] border-linha px-3.5 py-3 text-[15px] outline-none focus:border-azul focus:ring-2 focus:ring-azul"
            />
          </div>

          <div className="mb-2 flex items-center justify-between text-[11.5px] text-tinta-2">
            <span>
              {base.inscritos.length} na base local
              {base.atualizadoEm ? ` · atualizada às ${formatarHora(new Date(base.atualizadoEm).toISOString())}` : ""}
            </span>
            <button type="button" onClick={() => void base.atualizar()} disabled={base.atualizando} className="font-semibold text-azul-escuro hover:underline disabled:opacity-60">
              {base.atualizando ? "Atualizando…" : "Atualizar"}
            </button>
          </div>
          {base.erro ? <p className="mb-2 text-[12px] text-erro">{base.erro}</p> : null}

          {base.carregando ? (
            <p className="py-6 text-center text-[14px] text-tinta-2">Carregando base…</p>
          ) : resultados.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-tinta-2">
              Nenhum participante encontrado.
              <br />
              Use o cadastro rápido ao lado.
            </p>
          ) : (
            <ul aria-label="Participantes">
              {resultados.map((i) => (
                <ItemInscrito key={i.codigo} inscrito={i} ocupado={ocupado} aoConfirmar={() => void confirmar(i.codigo)} />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-cartao border border-linha bg-superficie p-5">
          <FormularioInscricao
            prefixoId="porta"
            titulo="Cadastro rápido na porta"
            subtitulo="Para quem chegou sem inscrição prévia — entra direto como presente."
            rotuloBotao="Registrar entrada"
            enviando={enviandoPorta}
            erroEnvio={erroPorta}
            onEnviar={porta}
          />
        </section>
      </div>
    </>
  );
}
