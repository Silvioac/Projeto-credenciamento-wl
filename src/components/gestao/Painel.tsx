"use client";

import { useMemo, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { useToast } from "@/components/ui/Toast";
import { baixarCsv } from "@/lib/csv";
import { formatarHora } from "@/lib/formato";
import type { BaseInscritos } from "@/lib/gestao/base";
import { calcularPainel } from "@/lib/gestao/painel";
import { buscarTodosInscritos } from "@/lib/inscricoes";
import { mensagemDeErro } from "@/lib/rede";

function Metrica({ valor, rotulo, destaque }: { valor: string | number; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-cartao border p-4 ${destaque ? "border-azul-escuro bg-azul-escuro" : "border-linha bg-white"}`}>
      <div className={`text-[30px] font-extrabold leading-[1.1] ${destaque ? "text-white" : "text-azul-escuro"}`}>{valor}</div>
      <div className={`mt-1 text-[12px] ${destaque ? "text-azul-claro" : "text-tinta-2"}`}>{rotulo}</div>
    </div>
  );
}

export function Painel({ base }: { base: BaseInscritos }) {
  const toast = useToast();
  const [exportando, setExportando] = useState(false);
  const dados = useMemo(() => calcularPainel(base.inscritos), [base.inscritos]);
  const maximo = dados.profissoes[0]?.total ?? 1;

  async function exportar() {
    setExportando(true);
    try {
      // Com rede, baixa a base fresca do servidor; sem rede, usa a cópia local.
      const lista = navigator.onLine ? await buscarTodosInscritos() : base.inscritos;
      const arquivo = baixarCsv(lista);
      toast(`CSV gerado: ${arquivo} (${lista.length} registros)`, "ok");
    } catch (e) {
      toast(`Falha ao exportar: ${mensagemDeErro(e)}`, "erro");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metrica valor={dados.resumo.presentes} rotulo="Presentes agora" destaque />
        <Metrica valor={dados.resumo.total} rotulo="Inscritos no total" />
        <Metrica valor={`${dados.resumo.taxa}%`} rotulo="Comparecimento" />
        <Metrica valor={dados.resumo.porta} rotulo="Cadastros na porta" />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-cartao border border-linha bg-superficie p-5" aria-label="Perfil do público por profissão">
          <h2 className="mb-3.5 text-[14px] font-bold text-azul-escuro">Perfil do público por profissão</h2>
          {dados.profissoes.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-tinta-2">Nenhuma inscrição ainda.</p>
          ) : (
            <ul>
              {dados.profissoes.map((p) => (
                <li key={p.profissao} className="mb-2.5 flex items-center gap-2.5">
                  <span className="w-[110px] shrink-0 text-right text-[12.5px] text-tinta-2 sm:w-[150px]" title={p.profissao}>
                    {p.profissao.replace(" / ", "/")}
                  </span>
                  <span className="h-[22px] flex-1 overflow-hidden rounded-md bg-fundo" role="img" aria-label={`${p.total} inscritos, ${p.presentes} presentes`}>
                    <span className="relative block h-full rounded-md bg-azul transition-[width] duration-500" style={{ width: `${Math.max(2, Math.round((p.total / maximo) * 100))}%` }}>
                      <span className="absolute inset-y-0 left-0 rounded-md bg-azul-escuro" style={{ width: p.total ? `${Math.round((p.presentes / p.total) * 100)}%` : 0 }} />
                    </span>
                  </span>
                  <span className="w-[62px] shrink-0 text-[12.5px] font-bold text-azul-escuro">
                    {p.total}
                    <span className="font-normal text-tinta-2"> · {p.presentes}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-tinta-2">Barra clara: inscritos · barra escura: presentes.</p>
        </section>

        <section className="rounded-cartao border border-linha bg-superficie p-5" aria-label="Últimas entradas">
          <h2 className="mb-3.5 text-[14px] font-bold text-azul-escuro">Últimas entradas</h2>
          {dados.ultimasEntradas.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-tinta-2">Nenhuma entrada registrada ainda.</p>
          ) : (
            <ul aria-live="polite">
              {dados.ultimasEntradas.map((i) => (
                <li key={i.codigo} className="flex items-baseline gap-2.5 border-b border-fundo py-2 text-[13px]">
                  <span className="w-11 shrink-0 text-[11.5px] text-tinta-2">{formatarHora(i.hora_entrada)}</span>
                  <span>
                    <strong className="font-semibold">{i.nome}</strong> · {i.profissao}
                    {i.origem === "porta" ? " · cadastro na porta" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Botao type="button" variante="linha" carregando={exportando} onClick={() => void exportar()}>
              ⬇ Exportar CSV (base completa)
            </Botao>
          </div>
        </section>
      </div>

      <p className="mt-4 text-center text-[11.5px] text-tinta-2">
        {base.realtimeAtivo
          ? "Tempo real ativo, com conferência a cada 10 s."
          : "Tempo real indisponível: conferindo o servidor a cada 10 s."}
        {base.atualizadoEm ? ` Última leitura do servidor às ${formatarHora(new Date(base.atualizadoEm).toISOString())}.` : ""}
      </p>
    </div>
  );
}
