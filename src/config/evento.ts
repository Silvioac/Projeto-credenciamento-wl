/**
 * Configuração do evento — ÚNICA fonte de valores específicos do cliente.
 * Para reaproveitar o sistema em outro evento, altere apenas este arquivo
 * (e as logos em /public) — nada do resto do código conhece a WL.
 */
export const evento = {
  /** Nome curto usado em títulos e na credencial. */
  nome: "WL Experience 2026",
  /** Complemento exibido abaixo do nome (edição, tema). */
  subtitulo: "Dia do Eletricista · 7ª edição",
  /** Organizador / dono da base de dados. */
  organizador: "WL Atacadista",
  /** Data no formato ISO (usada em metadados e comprovante). */
  dataISO: "2026-10-17",
  /** Data e horário legíveis para o público. */
  dataTexto: "17/10/2026",
  horarioTexto: "08h às 14h",
  local: "WL Atacadista · Brasília/DF",
  /** Fuso horário para exibir horas de entrada corretamente em qualquer aparelho. */
  fusoHorario: "America/Sao_Paulo",
  /** Prefixo do código de inscrição: gera `WL-XXXXXX`. */
  prefixoCodigo: "WL",
  /** Logos em /public (a clara é usada sobre fundos azuis). */
  logoEscura: "/logo-wl-horizontal.svg",
  logoClara: "/logo-wl-horizontal-clara.svg",
  /** Opções do campo Profissão (formulário público e cadastro na porta). */
  profissoes: [
    "Eletricista",
    "Engenheiro(a) Eletricista",
    "Engenheiro(a) Civil",
    "Construtor(a) / Empreiteiro(a)",
    "Arquiteto(a)",
    "Lojista / Revendedor(a)",
    "Comprador(a) corporativo",
    "Outra",
  ],
  /** Quem desenvolveu — aparece no rodapé de todas as páginas. */
  desenvolvedor: {
    nome: "DS TecnoFisio",
    complemento: "Tecnologia Integrada · Brasília/DF",
  },
} as const;

export type Profissao = (typeof evento.profissoes)[number];

/** Texto em caixa alta usado na faixa da credencial, ex.: "WL EXPERIENCE 2026 · 17/10/2026". */
export const faixaCredencial = `${evento.nome} · ${evento.dataTexto}`.toUpperCase();
