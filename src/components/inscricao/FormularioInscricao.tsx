"use client";

import { useState, type FormEvent } from "react";
import { evento } from "@/config/evento";
import { Botao } from "@/components/ui/Botao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { mascararTelefone } from "@/lib/formato";
import { temErros, validarInscricao, type DadosInscricao, type ErrosInscricao } from "@/lib/validacao";

interface Props {
  titulo: string;
  subtitulo: string;
  rotuloBotao: string;
  enviando: boolean;
  erroEnvio: string | null;
  onEnviar: (dados: DadosInscricao) => Promise<void>;
  /** Prefixo dos ids dos campos (evita colisão quando há dois formulários na tela). */
  prefixoId?: string;
}

const vazio: DadosInscricao = { nome: "", telefone: "", profissao: "", email: "" };

/** Formulário reutilizado na inscrição pública e no cadastro rápido da porta. */
export function FormularioInscricao({
  titulo,
  subtitulo,
  rotuloBotao,
  enviando,
  erroEnvio,
  onEnviar,
  prefixoId = "f",
}: Props) {
  const [dados, setDados] = useState<DadosInscricao>(vazio);
  const [erros, setErros] = useState<ErrosInscricao>({});

  function alterar<K extends keyof DadosInscricao>(campo: K, valor: DadosInscricao[K]) {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  }

  async function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    const limpos: DadosInscricao = {
      nome: dados.nome.trim().replace(/\s+/g, " "),
      telefone: dados.telefone.trim(),
      profissao: dados.profissao,
      email: dados.email.trim().toLowerCase(),
    };
    const resultado = validarInscricao(limpos);
    setErros(resultado);
    if (temErros(resultado)) {
      const primeiro = Object.keys(resultado)[0];
      document.getElementById(`${prefixoId}-${primeiro}`)?.focus();
      return;
    }
    await onEnviar(limpos);
    setDados(vazio);
  }

  return (
    <form onSubmit={aoSubmeter} noValidate aria-busy={enviando}>
      <h1 className="mb-1 text-[22px] font-bold text-azul-escuro">{titulo}</h1>
      <p className="mb-4 text-[13.5px] text-tinta-2">{subtitulo}</p>

      <CampoTexto
        id={`${prefixoId}-nome`}
        rotulo="Nome completo"
        type="text"
        autoComplete="name"
        placeholder="Seu nome"
        value={dados.nome}
        onChange={(e) => alterar("nome", e.target.value)}
        erro={erros.nome}
        maxLength={120}
        required
      />
      <CampoTexto
        id={`${prefixoId}-telefone`}
        rotulo="Telefone / WhatsApp"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="(61) 99999-9999"
        value={dados.telefone}
        onChange={(e) => alterar("telefone", mascararTelefone(e.target.value))}
        erro={erros.telefone}
        maxLength={15}
        required
      />
      <CampoSelecao
        id={`${prefixoId}-profissao`}
        rotulo="Profissão"
        opcoes={evento.profissoes}
        value={dados.profissao}
        onChange={(e) => alterar("profissao", e.target.value)}
        erro={erros.profissao}
        required
      />
      <CampoTexto
        id={`${prefixoId}-email`}
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        placeholder="voce@email.com"
        value={dados.email}
        onChange={(e) => alterar("email", e.target.value)}
        erro={erros.email}
        maxLength={160}
        required
      />

      {erroEnvio ? (
        <div role="alert" className="mb-3.5 rounded-[10px] border border-erro/30 bg-erro-suave px-3.5 py-3 text-[13.5px] text-erro">
          {erroEnvio}
        </div>
      ) : null}

      <Botao type="submit" carregando={enviando}>
        {enviando ? "Enviando…" : rotuloBotao}
      </Botao>
    </form>
  );
}
