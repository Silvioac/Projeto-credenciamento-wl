import type { Database } from "./database.types";

export type { Database };

export type Origem = "online" | "porta";

type LinhaInscrito = Database["public"]["Tables"]["inscritos"]["Row"];

/** Linha da tabela `inscritos` com `origem` restrita aos valores válidos. */
export interface Inscrito extends Omit<LinhaInscrito, "origem"> {
  origem: Origem;
}

/** Dados enviados na inserção (id e criado_em têm default no banco). */
export interface NovoInscrito {
  codigo: string;
  nome: string;
  telefone: string;
  profissao: string;
  email: string;
  presente: boolean;
  hora_entrada: string | null;
  origem: Origem;
  criado_em?: string;
}

export interface ResumoPainel {
  total: number;
  presentes: number;
  porta: number;
}

export interface ContagemProfissao {
  profissao: string;
  total: number;
  presentes: number;
}

/** Converte a linha crua do banco para o tipo da aplicação. */
export function comoInscrito(linha: LinhaInscrito): Inscrito {
  return { ...linha, origem: linha.origem === "porta" ? "porta" : "online" };
}
