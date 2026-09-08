import type { ContagemProfissao, Inscrito, ResumoPainel } from "@/lib/tipos";

export interface DadosPainel {
  resumo: ResumoPainel & { taxa: number };
  profissoes: ContagemProfissao[];
  ultimasEntradas: Inscrito[];
}

/**
 * Agrega o painel a partir da base já carregada (uma única consulta paginada
 * alimenta recepção e painel — nada de N+1). Funciona offline.
 */
export function calcularPainel(inscritos: Inscrito[], limiteFeed = 8): DadosPainel {
  let presentes = 0;
  let porta = 0;
  const porProfissao = new Map<string, ContagemProfissao>();

  for (const i of inscritos) {
    if (i.presente) presentes++;
    if (i.origem === "porta") porta++;
    const c = porProfissao.get(i.profissao) ?? { profissao: i.profissao, total: 0, presentes: 0 };
    c.total++;
    if (i.presente) c.presentes++;
    porProfissao.set(i.profissao, c);
  }

  const total = inscritos.length;
  const profissoes = [...porProfissao.values()].sort(
    (a, b) => b.total - a.total || a.profissao.localeCompare(b.profissao, "pt-BR"),
  );
  const ultimasEntradas = inscritos
    .filter((i) => i.presente && i.hora_entrada)
    .sort((a, b) => (b.hora_entrada as string).localeCompare(a.hora_entrada as string))
    .slice(0, limiteFeed);

  return {
    resumo: { total, presentes, porta, taxa: total ? Math.round((presentes / total) * 100) : 0 },
    profissoes,
    ultimasEntradas,
  };
}
