import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { StatusConexao } from "@/components/StatusConexao";
import { FluxoInscricao } from "@/components/inscricao/FluxoInscricao";
import { evento } from "@/config/evento";

export const metadata: Metadata = {
  title: "Inscrição",
  description: `Faça sua inscrição no ${evento.nome} (${evento.subtitulo}) e receba a credencial digital com QR code.`,
};

export default function PaginaInscricao() {
  return (
    <>
      <Cabecalho acoes={<StatusConexao />} />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-14 pt-6">
        <div className="mx-auto max-w-[520px]">
          <FluxoInscricao />
        </div>
      </main>
    </>
  );
}
