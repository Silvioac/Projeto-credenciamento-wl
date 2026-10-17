"use client";

import { useState, type FormEvent } from "react";
import { evento } from "@/config/evento";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/Campo";
import { apenasDigitos, mascararTelefone, primeiroNome } from "@/lib/formato";
import { mensagemDeErro } from "@/lib/rede";
import { entrarNoSorteio } from "@/lib/sorteio";

type Estado = { tipo: "form" } | { tipo: "pronto"; nome: string; jaParticipava: boolean };

/** Página pública do sorteio ao vivo: nome + telefone e pronto. */
export function FormularioSorteio() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erros, setErros] = useState<{ nome?: string; telefone?: string }>({});
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "form" });

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const nomeLimpo = nome.trim().replace(/\s+/g, " ");
    const novosErros: typeof erros = {};
    if (nomeLimpo.split(" ").length < 2 || nomeLimpo.length < 5) novosErros.nome = "Informe nome e sobrenome.";
    const d = apenasDigitos(telefone);
    if (d.length < 10 || d.length > 11) novosErros.telefone = "Informe um telefone válido com DDD.";
    setErros(novosErros);
    if (novosErros.nome || novosErros.telefone) return;

    setEnviando(true);
    setErroEnvio(null);
    try {
      const r = await entrarNoSorteio(nomeLimpo, telefone.trim());
      setEstado({ tipo: "pronto", nome: nomeLimpo, jaParticipava: r === "ja_participa" });
    } catch (e) {
      setErroEnvio(`${mensagemDeErro(e)} Tente de novo.`);
    } finally {
      setEnviando(false);
    }
  }

  if (estado.tipo === "pronto") {
    return (
      <div className="rounded-cartao border border-linha bg-superficie p-6 text-center">
        <div className="mb-2 text-[44px]" aria-hidden>🎉</div>
        <h1 className="mb-2 text-[22px] font-bold text-azul-escuro">
          {estado.jaParticipava ? "Você já está participando!" : `Pronto, ${primeiroNome(estado.nome)}!`}
        </h1>
        <p className="text-[15px] text-tinta-2">
          {estado.jaParticipava
            ? "Esse telefone já está no sorteio. Não precisa se cadastrar de novo."
            : "Você está concorrendo. Fique de olho no telão e boa sorte!"}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate aria-busy={enviando} className="rounded-cartao border border-linha bg-superficie p-6">
      <h1 className="mb-1 text-[22px] font-bold text-azul-escuro">Sorteio ao vivo</h1>
      <p className="mb-4 text-[13.5px] text-tinta-2">
        {evento.nome}. Cadastre-se para concorrer ao sorteio no palco.
      </p>
      <CampoTexto
        id="s-nome"
        rotulo="Nome completo"
        autoComplete="name"
        placeholder="Seu nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={erros.nome}
        maxLength={120}
        required
      />
      <CampoTexto
        id="s-telefone"
        rotulo="Telefone / WhatsApp"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="(61) 99999-9999"
        value={telefone}
        onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
        erro={erros.telefone}
        maxLength={15}
        required
      />
      {erroEnvio ? (
        <div role="alert" className="mb-3.5 rounded-[10px] border border-erro/30 bg-erro-suave px-3.5 py-3 text-[13.5px] text-erro">
          {erroEnvio}
        </div>
      ) : null}
      <Botao type="submit" carregando={enviando}>
        {enviando ? "Enviando…" : "Quero participar"}
      </Botao>
    </form>
  );
}
