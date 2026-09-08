import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O CLAUDE.md deste projeto é escrito à mão; não deixar o Next sobrescrever.
  agentRules: false,
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
