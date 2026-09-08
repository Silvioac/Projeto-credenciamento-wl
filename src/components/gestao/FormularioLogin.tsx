"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/Campo";
import { supabaseNavegador } from "@/lib/supabase/client";
import { ehErroDeRede } from "@/lib/rede";

export function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setEnviando(true);
    try {
      const sb = supabaseNavegador();
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
      if (error) {
        if (ehErroDeRede(error)) setErro("Sem conexão. Verifique a internet e tente de novo.");
        else if (error.status === 400 || /invalid/i.test(error.message)) setErro("E-mail ou senha incorretos.");
        else setErro(`Não foi possível entrar: ${error.message}`);
        return;
      }
      const voltar = params.get("voltar");
      const destino = voltar && voltar.startsWith("/gestao") ? voltar : "/gestao";
      router.replace(destino);
      router.refresh();
    } catch {
      setErro("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={entrar} noValidate aria-busy={enviando}>
      <h1 className="mb-1 text-[22px] font-bold text-azul-escuro">Área da equipe</h1>
      <p className="mb-4 text-[13.5px] text-tinta-2">
        Acesso restrito à recepção e à organização do evento.
      </p>
      <CampoTexto
        id="login-email"
        rotulo="E-mail"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <CampoTexto
        id="login-senha"
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
      />
      {erro ? (
        <div role="alert" className="mb-3.5 rounded-[10px] border border-erro/30 bg-erro-suave px-3.5 py-3 text-[13.5px] text-erro">
          {erro}
        </div>
      ) : null}
      <Botao type="submit" carregando={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
