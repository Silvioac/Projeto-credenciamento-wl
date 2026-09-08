import Image from "next/image";
import { evento } from "@/config/evento";

interface Props {
  /** `clara` para fundos azuis/escuros. */
  variante?: "escura" | "clara";
  altura?: number;
  className?: string;
}

/** Logo do organizador (arquivos definidos em config/evento.ts). */
export function Logo({ variante = "escura", altura = 44, className }: Props) {
  const src = variante === "clara" ? evento.logoClara : evento.logoEscura;
  // Proporção das logos: 488 x 118
  const largura = Math.round((altura * 488) / 118);
  return (
    <Image
      src={src}
      alt={evento.organizador}
      width={largura}
      height={altura}
      priority
      className={className}
      style={{ height: altura, width: "auto" }}
    />
  );
}
