import { evento } from "@/config/evento";
import { apenasDigitos } from "./formato";

export interface DadosInscricao {
  nome: string;
  telefone: string;
  profissao: string;
  email: string;
}

export type ErrosInscricao = Partial<Record<keyof DadosInscricao, string>>;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida o formulário e devolve mensagens em português por campo (vazio = válido). */
export function validarInscricao(d: DadosInscricao): ErrosInscricao {
  const erros: ErrosInscricao = {};

  const partesNome = d.nome.trim().split(/\s+/).filter(Boolean);
  if (partesNome.length < 2 || d.nome.trim().length < 5) {
    erros.nome = "Informe seu nome completo (nome e sobrenome).";
  }

  const digitos = apenasDigitos(d.telefone);
  if (digitos.length < 10 || digitos.length > 11) {
    erros.telefone = "Informe um telefone válido com DDD.";
  }

  const profissoes: readonly string[] = evento.profissoes;
  if (!d.profissao || !profissoes.includes(d.profissao)) {
    erros.profissao = "Selecione sua profissão.";
  }

  if (!REGEX_EMAIL.test(d.email.trim())) {
    erros.email = "Informe um e-mail válido.";
  }

  return erros;
}

export function temErros(erros: ErrosInscricao): boolean {
  return Object.keys(erros).length > 0;
}
