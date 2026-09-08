"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { normalizarCodigo } from "@/lib/codigo";
import { Botao } from "@/components/ui/Botao";

interface Props {
  /** Chamado com o código já normalizado (WL-XXXXXX). */
  aoLer: (codigo: string) => void | Promise<void>;
  /** Enquanto true, leituras são ignoradas (ex.: confirmação na tela). */
  pausado: boolean;
  aoFechar: () => void;
}

const ID_ALVO = "leitor-qr";
const INTERVALO_MESMO_CODIGO_MS = 4000;

/** Leitura de QR code pela câmera (html5-qrcode), com proteção contra leituras repetidas. */
export function LeitorQR({ aoLer, pausado, aoFechar }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const pausadoRef = useRef(pausado);
  const ultimo = useRef<{ codigo: string; quando: number } | null>(null);
  const aoLerRef = useRef(aoLer);
  useEffect(() => {
    pausadoRef.current = pausado;
    aoLerRef.current = aoLer;
  }, [pausado, aoLer]);

  useEffect(() => {
    let leitor: Html5Qrcode | null = null;
    let cancelado = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelado) return;
        leitor = new Html5Qrcode(ID_ALVO, { verbose: false });
        await leitor.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (texto) => {
            if (pausadoRef.current) return;
            const codigo = normalizarCodigo(texto);
            if (!codigo) return;
            const agora = Date.now();
            if (ultimo.current && ultimo.current.codigo === codigo && agora - ultimo.current.quando < INTERVALO_MESMO_CODIGO_MS) {
              return;
            }
            ultimo.current = { codigo, quando: agora };
            void aoLerRef.current(codigo);
          },
          undefined,
        );
        if (!cancelado) setPronto(true);
      } catch (e) {
        if (cancelado) return;
        const msg = String((e as Error)?.message ?? e);
        setErro(
          /permission|NotAllowed/i.test(msg)
            ? "Permita o acesso à câmera para ler o QR code."
            : /NotFound|no camera|Requested device not found/i.test(msg)
              ? "Nenhuma câmera encontrada neste aparelho."
              : "Não foi possível abrir a câmera. Use a busca por nome ou código.",
        );
      }
    })();

    return () => {
      cancelado = true;
      const l = leitor;
      if (!l) return;
      (async () => {
        try {
          if (l.isScanning) await l.stop();
        } catch {
          // já parado
        }
        try {
          l.clear();
        } catch {
          // ignorar
        }
      })();
    };
  }, []);

  return (
    <div className="rounded-cartao border border-linha bg-superficie p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[14px] font-bold text-azul-escuro">Leitura de QR code</div>
        <Botao variante="linha" largura="auto" className="!px-3 !py-1.5 !text-[12.5px]" type="button" onClick={aoFechar}>
          Fechar câmera
        </Botao>
      </div>
      <div
        id={ID_ALVO}
        className="mx-auto w-full max-w-[360px] overflow-hidden rounded-xl bg-grafite [&_video]:!w-full"
        aria-label="Visor da câmera"
      />
      {erro ? (
        <p role="alert" className="mt-3 text-center text-[13px] text-erro">
          {erro}
        </p>
      ) : (
        <p className="mt-3 text-center text-[12.5px] text-tinta-2">
          {pronto ? "Aponte para o QR code da credencial." : "Abrindo a câmera…"}
        </p>
      )}
    </div>
  );
}
