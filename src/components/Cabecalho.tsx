import type { ReactNode } from "react";
import { evento } from "@/config/evento";
import { Logo } from "./Logo";

interface Props {
  /** Conteúdo à direita (status de conexão, botão sair). */
  acoes?: ReactNode;
}

export function Cabecalho({ acoes }: Props) {
  return (
    <header className="nao-imprimir border-b border-linha bg-superficie px-4 py-3">
      <div className="mx-auto flex max-w-[1040px] items-center gap-3">
        <Logo className="h-7 w-auto shrink-0 min-[400px]:h-9 sm:h-10" />
        <div className="hidden border-l border-linha pl-3 text-[11.5px] leading-snug text-tinta-2 sm:block">
          <b className="block text-[12.5px] text-azul-escuro">
            Credenciamento · {evento.nome}
          </b>
          {evento.dataTexto} · {evento.horarioTexto} · {evento.local}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">{acoes}</div>
      </div>
    </header>
  );
}
