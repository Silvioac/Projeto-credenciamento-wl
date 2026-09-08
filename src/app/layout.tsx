import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { evento } from "@/config/evento";
import { tema, variaveisCss } from "@/config/theme";
import { Rodape } from "@/components/Rodape";
import { ProvedoresCliente } from "@/components/ProvedoresCliente";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `Credenciamento · ${evento.nome}`,
    template: `%s · ${evento.nome}`,
  },
  description: `Inscrição e credenciamento do ${evento.nome} (${evento.subtitulo}) — ${evento.dataTexto}, ${evento.local}.`,
  applicationName: `Credenciamento ${evento.nome}`,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: evento.nome,
  },
  icons: {
    icon: [
      { url: "/icons/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icone-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: tema.cores.azulEscuro,
  width: "device-width",
  initialScale: 1,
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} h-full antialiased`}>
      <head>
        {/* Tokens de cor de src/config/theme.ts — única fonte da verdade */}
        <style dangerouslySetInnerHTML={{ __html: variaveisCss() }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ProvedoresCliente>
          {children}
          <Rodape />
        </ProvedoresCliente>
      </body>
    </html>
  );
}
