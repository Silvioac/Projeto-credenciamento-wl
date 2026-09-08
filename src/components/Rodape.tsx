import { evento } from "@/config/evento";

export function Rodape() {
  return (
    <footer className="nao-imprimir mt-auto border-t border-linha px-4 py-5 text-center text-[11.5px] text-tinta-2">
      Sistema desenvolvido por{" "}
      <b className="text-azul-escuro">{evento.desenvolvedor.nome}</b>
      {evento.desenvolvedor.complemento ? ` · ${evento.desenvolvedor.complemento}` : null}
    </footer>
  );
}
