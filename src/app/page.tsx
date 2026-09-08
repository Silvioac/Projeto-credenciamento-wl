import { redirect } from "next/navigation";

/** A raiz sempre leva para a inscrição pública (também configurado em next.config.ts). */
export default function Raiz() {
  redirect("/inscricao");
}
