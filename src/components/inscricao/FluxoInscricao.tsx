"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Botao } from "@/components/ui/Botao";
import { useConexao } from "@/hooks/useConexao";
import { gerarCodigo } from "@/lib/codigo";
import { enviarOuEnfileirar, novaOperacao, type StatusEnvio } from "@/lib/fila/fila";
import { mensagemDeErro } from "@/lib/rede";
import type { NovoInscrito } from "@/lib/tipos";
import type { DadosInscricao } from "@/lib/validacao";
import { Credencial } from "./Credencial";
import { Comprovante } from "./Comprovante";
import { FormularioInscricao } from "./FormularioInscricao";

interface Resultado {
  inscrito: NovoInscrito & { criado_em: string };
  envio: StatusEnvio;
  criadaEm: number;
}

/** Página pública: formulário → credencial + comprovante. Funciona offline (fila). */
export function FluxoInscricao() {
  const toast = useToast();
  const conexao = useConexao();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  // Derivado: a inscrição ficou pendente e, depois dela, a fila esvaziou com rede.
  const confirmadaDepois =
    resultado?.envio === "pendente" &&
    conexao.online &&
    !conexao.sincronizando &&
    conexao.pendentes === 0 &&
    conexao.ultimaSincronizacao !== null &&
    conexao.ultimaSincronizacao > resultado.criadaEm;

  async function enviar(dados: DadosInscricao) {
    setErro(null);
    setEnviando(true);
    const inscrito: NovoInscrito & { criado_em: string } = {
      codigo: gerarCodigo(),
      ...dados,
      presente: false,
      hora_entrada: null,
      origem: "online",
      criado_em: new Date().toISOString(),
    };
    try {
      const { envio } = await enviarOuEnfileirar(novaOperacao({ tipo: "inscricao", dados: inscrito }));
      setResultado({ inscrito, envio, criadaEm: Date.now() });
      toast(
        envio === "enviado"
          ? "Inscrição confirmada! Credencial e comprovante gerados."
          : "Credencial gerada. A inscrição será confirmada quando a conexão voltar.",
        envio === "enviado" ? "ok" : "info",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErro(`${mensagemDeErro(e)} Verifique os dados e tente novamente.`);
      toast("Não foi possível enviar a inscrição.", "erro");
    } finally {
      setEnviando(false);
    }
  }

  if (!resultado) {
    return (
      <div className="rounded-cartao border border-linha bg-superficie p-6">
        <FormularioInscricao
          titulo="Garanta seu acesso ao evento"
          subtitulo="Preencha seus dados e receba sua credencial digital com QR code e o comprovante de inscrição. Leva menos de um minuto."
          rotuloBotao="Confirmar inscrição"
          enviando={enviando}
          erroEnvio={erro}
          onEnviar={enviar}
        />
      </div>
    );
  }

  const { inscrito, envio } = resultado;
  const pendente = envio === "pendente" && !confirmadaDepois;

  return (
    <div>
      {pendente ? (
        <div
          role="status"
          className="nao-imprimir mb-3.5 rounded-[10px] border border-alerta/30 bg-alerta-suave px-3.5 py-2.5 text-[12.5px] text-alerta"
        >
          Sua inscrição está guardada neste aparelho e será confirmada automaticamente quando a conexão voltar.
          Mantenha esta página aberta ou volte a ela depois.
        </div>
      ) : envio === "pendente" && confirmadaDepois ? (
        <div role="status" className="nao-imprimir mb-3.5 rounded-[10px] border border-ok/30 bg-ok-suave px-3.5 py-2.5 text-[12.5px] text-ok">
          Conexão restabelecida: inscrição confirmada no servidor.
        </div>
      ) : null}

      <Credencial nome={inscrito.nome} profissao={inscrito.profissao} codigo={inscrito.codigo} />
      <Comprovante
        codigo={inscrito.codigo}
        nome={inscrito.nome}
        telefone={inscrito.telefone}
        profissao={inscrito.profissao}
        email={inscrito.email}
        criadoEm={inscrito.criado_em}
        pendente={pendente}
      />
      <div className="nao-imprimir mt-3.5">
        <Botao variante="linha" type="button" onClick={() => setResultado(null)}>
          Fazer outra inscrição
        </Botao>
      </div>
    </div>
  );
}
