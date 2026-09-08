import { evento } from "@/config/evento";

export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Máscara brasileira: (61) 99999-9999 ou (61) 3333-4444. */
export function mascararTelefone(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Hora local do evento no formato HH:MM. */
export function formatarHora(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: evento.fusoHorario,
  });
}

/** dd/mm/aaaa às HH:MM no fuso do evento. */
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR", { timeZone: evento.fusoHorario });
  return `${data} às ${formatarHora(iso)}`;
}

export function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Normaliza para busca: minúsculas e sem acentos. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
