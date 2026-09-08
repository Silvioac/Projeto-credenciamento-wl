import type { NextConfig } from "next";

/**
 * Política de segurança de conteúdo.
 *
 * `unsafe-inline` em script/style é exigido pelo Next (hidratação) e pelo Tailwind;
 * mesmo assim a política tem valor real: limita para onde a página pode enviar dados
 * (`connect-src`), impede que o site seja embutido em iframe de terceiros
 * (`frame-ancestors`) e bloqueia plugins e mudança de base (`object-src`, `base-uri`).
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:", // vídeo da câmera na leitura do QR code
  "font-src 'self' data:",
  // REST e Realtime do Supabase; nada além disso sai da página
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const cabecalhosSeguranca = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // A câmera é usada só pela própria página (leitura de QR na recepção).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  // O CLAUDE.md deste projeto é escrito à mão; não deixar o Next sobrescrever.
  agentRules: false,
  // Só em desenvolvimento: permite abrir o `npm run dev` pelo celular na mesma rede Wi-Fi
  // (http://IP-do-computador:3000). Sem isso o Next bloqueia o JavaScript para outras origens.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
  // Não anunciar a versão do framework.
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/", destination: "/inscricao", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:caminho*",
        headers: cabecalhosSeguranca,
      },
      {
        // A área da equipe nunca deve ser guardada em cache compartilhado nem indexada.
        source: "/gestao/:caminho*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // O service worker precisa ser sempre revalidado para atualizar o app.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
