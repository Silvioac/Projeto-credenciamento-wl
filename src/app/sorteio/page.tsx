import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { FormularioSorteio } from "@/components/sorteio/FormularioSorteio";
import { evento } from "@/config/evento";

export const metadata: Metadata = {
  title: "Sorteio ao vivo",
  description: `Cadastre-se no sorteio ao vivo do ${evento.nome}.`,
};

export default function PaginaSorteio() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-14 pt-6">
        <div className="mx-auto max-w-[520px]">
          <FormularioSorteio />
        </div>
      </main>
    </>
  );
}
