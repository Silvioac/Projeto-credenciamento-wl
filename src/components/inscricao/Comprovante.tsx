"use client";

import { evento } from "@/config/evento";
import { Logo } from "@/components/Logo";
import { Botao } from "@/components/ui/Botao";
import { formatarDataHora } from "@/lib/formato";

interface Props {
  codigo: string;
  nome: string;
  telefone: string;
  profissao: string;
  email: string;
  criadoEm: string;
  /** Quando true, mostra aviso de que a confirmação no servidor está pendente. */
  pendente?: boolean;
}

function Linha({ rotulo, children, destaque }: { rotulo: string; children: React.ReactNode; destaque?: boolean }) {
  return (
    <div className="flex justify-between gap-3.5 border-b border-dashed border-linha py-[7px] text-[13.5px] last:border-b-0">
      <span className="shrink-0 text-tinta-2">{rotulo}</span>
      <span className={`break-words text-right font-semibold ${destaque ? "tracking-[1px] text-azul-escuro" : ""}`}>
        {children}
      </span>
    </div>
  );
}

/** Comprovante de inscrição — é o único bloco que sai na impressão (ver globals.css). */
export function Comprovante({ codigo, nome, telefone, profissao, email, criadoEm, pendente }: Props) {
  return (
    <section id="comprovante" aria-label="Comprovante de inscrição" className="mt-3.5 rounded-cartao border border-linha bg-white p-6">
      <div className="mb-3.5 flex items-center justify-between gap-2.5 border-b-2 border-azul pb-3">
        <Logo altura={30} />
        <div className="text-right text-[13px] font-extrabold leading-tight text-azul-escuro">
          COMPROVANTE DE INSCRIÇÃO
          <span className="block text-[10.5px] font-semibold text-tinta-2">
            {evento.nome} · {evento.subtitulo}
          </span>
        </div>
      </div>
      <Linha rotulo="Nº de inscrição" destaque>
        {codigo}
      </Linha>
      <Linha rotulo="Nome">{nome}</Linha>
      <Linha rotulo="Telefone">{telefone}</Linha>
      <Linha rotulo="Profissão">{profissao}</Linha>
      <Linha rotulo="E-mail">{email}</Linha>
      <Linha rotulo="Data e hora da inscrição">{formatarDataHora(criadoEm)}</Linha>
      <Linha rotulo="Evento">
        {evento.dataTexto} · {evento.horarioTexto} · {evento.local}
      </Linha>
      <p className="mt-3 border-t border-linha pt-2.5 text-[11.5px] text-tinta-2">
        Este comprovante confirma o seu cadastro no evento. A entrada é feita pela credencial digital com QR code.
        {pendente
          ? " Inscrição registrada neste aparelho; a confirmação no servidor acontece automaticamente quando a conexão voltar."
          : ""}
      </p>
      <div className="nao-imprimir mt-3.5">
        <Botao variante="claro" type="button" onClick={() => window.print()}>
          Imprimir / salvar comprovante em PDF
        </Botao>
      </div>
    </section>
  );
}
