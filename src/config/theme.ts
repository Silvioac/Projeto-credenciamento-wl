/**
 * Tokens de identidade visual — ÚNICA fonte da verdade para cores.
 * O Tailwind (globals.css) consome estes valores via variáveis CSS
 * injetadas no <html> pelo layout raiz; nada de hex espalhado nos componentes.
 */
export const tema = {
  cores: {
    azul: "#3C8BD6", // marca
    azulEscuro: "#1E5B94", // botões e títulos
    azulNoite: "#153F68",
    azulClaro: "#BCD4EA", // texto secundário sobre azul
    azulSuave: "#E4EEF8", // avatares, fundos leves
    grafite: "#232323",
    claro: "#F2F2F2",
    fundo: "#F3F6FA",
    superficie: "#FFFFFF",
    tinta: "#232323",
    tinta2: "#5A6675",
    linha: "#DCE4EE",
    ok: "#1E9E5A",
    okSuave: "#E2F5EA",
    erro: "#C93A3A",
    erroSuave: "#FBE9E9",
    alerta: "#B7791F",
    alertaSuave: "#FFF4DB",
  },
  raio: "14px",
} as const;

export type NomeCor = keyof typeof tema.cores;

/** Converte camelCase em kebab-case: azulEscuro -> azul-escuro. */
function kebab(nome: string): string {
  return nome.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);
}

/** Gera o bloco `:root{...}` com todas as variáveis `--wl-*`. */
export function variaveisCss(): string {
  const linhas = Object.entries(tema.cores).map(
    ([nome, valor]) => `--wl-${kebab(nome)}:${valor};`,
  );
  linhas.push(`--wl-raio:${tema.raio};`);
  return `:root{${linhas.join("")}}`;
}
