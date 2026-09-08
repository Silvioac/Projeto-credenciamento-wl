import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "claro" | "linha" | "perigo";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  carregando?: boolean;
  largura?: "total" | "auto";
  children: ReactNode;
}

const estilos: Record<Variante, string> = {
  primario: "bg-azul-escuro text-white hover:bg-azul-noite",
  claro: "bg-azul text-white hover:bg-azul-escuro",
  linha: "border-[1.5px] border-linha bg-transparent text-tinta-2 hover:border-azul hover:text-azul-escuro",
  perigo: "bg-erro text-white hover:opacity-90",
};

export function Botao({
  variante = "primario",
  carregando = false,
  largura = "total",
  className = "",
  disabled,
  children,
  ...resto
}: Props) {
  return (
    <button
      {...resto}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-3.5 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        largura === "total" ? "w-full" : ""
      } ${estilos[variante]} ${className}`}
    >
      {carregando ? (
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
