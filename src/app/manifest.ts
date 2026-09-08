import type { MetadataRoute } from "next";
import { evento } from "@/config/evento";
import { tema } from "@/config/theme";

/** Manifesto PWA (servido em /manifest.webmanifest). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `Credenciamento ${evento.nome}`,
    short_name: evento.nome,
    description: `Inscrição e check-in do ${evento.nome} · ${evento.subtitulo}`,
    start_url: "/inscricao",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: tema.cores.fundo,
    theme_color: tema.cores.azulEscuro,
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Inscrição", url: "/inscricao" },
      { name: "Recepção e painel", url: "/gestao" },
    ],
  };
}
