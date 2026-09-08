import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O CLAUDE.md deste projeto é escrito à mão; não deixar o Next sobrescrever.
  agentRules: false,
  // Só em desenvolvimento: permite abrir o `npm run dev` pelo celular na mesma rede Wi-Fi
  // (http://IP-do-computador:3000). Sem isso o Next bloqueia o JavaScript para outras origens.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
  async redirects() {
    return [{ source: "/", destination: "/inscricao", permanent: false }];
  },
  async headers() {
    return [
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
