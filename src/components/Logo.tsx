import Image from "next/image";
import { evento } from "@/config/evento";

/** Proporção dos arquivos de logo. */
const LARGURA = 488;
const ALTURA = 118;

interface Props {
  /** `clara` para fundos azuis/escuros. */
  variante?: "escura" | "clara";
  /**
   * Altura por classe do Tailwind (e não por style), para poder variar com a
   * largura da tela — em celular de 320px a logo precisa encolher, senão empurra
   * os botões do cabeçalho para fora.
   */
  className?: string;
}

export function Logo({ variante = "escura", className = "h-10 w-auto" }: Props) {
  const src = variante === "clara" ? evento.logoClara : evento.logoEscura;
  return (
    <Image
      src={src}
      alt={evento.organizador}
      width={LARGURA}
      height={ALTURA}
      priority
      className={className}
    />
  );
}
