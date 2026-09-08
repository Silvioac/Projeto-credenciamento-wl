"use client";

import { QRCodeSVG } from "qrcode.react";
import { evento, faixaCredencial } from "@/config/evento";
import { tema } from "@/config/theme";
import { Logo } from "@/components/Logo";

interface Props {
  nome: string;
  profissao: string;
  codigo: string;
}

/** Credencial digital: gradiente azul, logo clara e QR code com o código. */
export function Credencial({ nome, profissao, codigo }: Props) {
  return (
    <section
      aria-label="Credencial digital"
      className="nao-imprimir mx-auto max-w-[360px] overflow-hidden rounded-[18px] text-center text-white"
      style={{
        background: `linear-gradient(160deg, ${tema.cores.azulEscuro}, ${tema.cores.azulNoite})`,
      }}
    >
      <div className="flex justify-center bg-white/10 px-5 py-3.5">
        <Logo variante="clara" className="h-[34px] w-auto" />
      </div>
      <div className="px-5 pb-6 pt-4">
        <div className="mb-3 text-[11px] font-bold tracking-[1.5px] text-azul-claro">{faixaCredencial}</div>
        <div className="mx-auto mb-3.5 flex h-[180px] w-[180px] items-center justify-center rounded-xl bg-white">
          <QRCodeSVG
            value={codigo}
            size={160}
            level="M"
            fgColor={tema.cores.azulNoite}
            bgColor="#FFFFFF"
            title={`QR code da inscrição ${codigo}`}
          />
        </div>
        <div className="text-[19px] font-bold">{nome}</div>
        <div className="mb-2.5 text-[13px] text-azul-claro">{profissao}</div>
        <div className="inline-block rounded-lg bg-white/15 px-3.5 py-1.5 text-[15px] font-bold tracking-[2px]">
          {codigo}
        </div>
      </div>
      <div className="px-5 pb-4 text-[11px] text-azul-claro/90">
        Apresente este QR code na entrada do {evento.nome}. Guarde um print no seu celular.
      </div>
    </section>
  );
}
