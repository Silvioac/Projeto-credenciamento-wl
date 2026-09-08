import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { FormularioLogin } from "@/components/gestao/FormularioLogin";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function PaginaLogin() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-14 pt-6">
        <div className="mx-auto max-w-[420px] rounded-cartao border border-linha bg-superficie p-6">
          <Suspense>
            <FormularioLogin />
          </Suspense>
        </div>
      </main>
    </>
  );
}
