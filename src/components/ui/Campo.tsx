import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

interface Base {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: ReactNode;
}

const classeControle =
  "w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-3 text-[15px] text-tinta outline-none focus:border-azul focus:ring-2 focus:ring-azul";

function Moldura({ id, rotulo, erro, dica, children }: Base & { children: ReactNode }) {
  return (
    <div className="mb-3.5">
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="mt-1 text-xs text-erro">
          {erro}
        </p>
      ) : dica ? (
        <p className="mt-1 text-xs text-tinta-2">{dica}</p>
      ) : null}
    </div>
  );
}

type PropsEntrada = Base & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function CampoTexto({ id, rotulo, erro, dica, className = "", ...resto }: PropsEntrada) {
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} dica={dica}>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={`${classeControle} ${erro ? "border-erro" : "border-linha"} ${className}`}
        {...resto}
      />
    </Moldura>
  );
}

type PropsSelecao = Base &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
    opcoes: readonly string[];
    vazio?: string;
  };

export function CampoSelecao({
  id,
  rotulo,
  erro,
  dica,
  opcoes,
  vazio = "Selecione…",
  className = "",
  ...resto
}: PropsSelecao) {
  return (
    <Moldura id={id} rotulo={rotulo} erro={erro} dica={dica}>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={`${classeControle} ${erro ? "border-erro" : "border-linha"} ${className}`}
        {...resto}
      >
        <option value="">{vazio}</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Moldura>
  );
}
