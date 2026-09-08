# CLAUDE.md — Sistema de Credenciamento · Evento WL Atacadista

## Contexto

Sistema de credenciamento de participantes do **WL Experience 2026 · Dia do Eletricista**
(7ª edição), evento presencial da WL Atacadista em 17/10/2026, das 08h às 14h, no
estacionamento coberto da própria WL Atacadista (Brasília/DF). Expectativa de 500 a 700
inscritos, mas a edição de 2025 teve mais de 1.000 presentes: dimensionar para isso.
Desenvolvido pela DS TecnoFisio. Briefing do evento: `referencia/wl-experience-2026-v6.pdf`.
Contato do cliente: Anderson Roque (Sócio Diretor WL).
O sistema captura nome, telefone, profissão e e-mail de cada participante, faz o check-in
na entrada e dá visão em tempo real à organização. A base de dados pertence à WL.

Este projeto deve nascer reaproveitável: outros eventos usarão o mesmo sistema no futuro,
então nada de valores fixos da WL espalhados pelo código — nome do evento, logo e cores
ficam em um único arquivo de configuração/tema.

## Stack (não mudar sem discutir)

- Next.js (App Router) + TypeScript + React
- Supabase: Postgres, Auth (equipe), Realtime (painel)
- Tailwind CSS com tokens do tema
- PWA: service worker + IndexedDB para offline
- Deploy: Vercel
- Projeto Supabase: "Projeto WL Credenciamento", ref `fcbpcrakjakyagcvbxqq`,
  URL `https://fcbpcrakjakyagcvbxqq.supabase.co`. A chave publishable (`sb_publishable_...`)
  é pública e vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY`; chaves secretas nunca entram no repositório.

## Rotas

- `/` → redireciona para `/inscricao`
- `/inscricao` — PÚBLICA. Formulário de cadastro → credencial digital com QR code + comprovante de inscrição (imprimível). É o link divulgado no QR code do evento.
- `/gestao` — PROTEGIDA (login Supabase Auth). Abas: Recepção (busca, check-in por câmera/QR ou por nome/código, cadastro rápido na porta) e Painel (métricas em tempo real, gráfico por profissão, feed de entradas, exportar CSV).

## Regras de negócio

1. Código de inscrição único no formato `WL-XXXXXX`, gerado no cliente (timestamp base36 + aleatório) para funcionar offline. O QR code da credencial contém apenas esse código.
2. Cadastro público NUNCA lê a base — só insere (RLS no Postgres, ver `schema.sql`). Leitura e alteração exigem login. Motivo: LGPD — dados de 700 pessoas não podem vazar por URL.
3. Check-in registra `presente = true` + `hora_entrada`. Check-in repetido do mesmo código não duplica nem dá erro grosseiro: mostra "já registrado às HH:MM".
4. Cadastro na porta entra com `origem = 'porta'` e `presente = true` imediato.
5. Exportação CSV da base completa disponível apenas na área logada.

## Resiliência (requisito central — o evento não pode parar)

- **Inscrição offline:** se o envio falhar (sem rede, timeout), a inscrição entra numa fila em IndexedDB e o participante recebe credencial + comprovante normalmente (o código já existe no cliente). Um banner discreto informa "inscrição será confirmada automaticamente quando a conexão voltar". Sincronização automática ao restaurar conexão (evento `online` + retry com backoff exponencial + Background Sync onde suportado).
- **Recepção offline:** a lista de inscritos é cacheada em IndexedDB (sincronizada quando online). Check-ins e cadastros de porta feitos offline entram na fila e sincronizam sozinhos. Indicador visível de status: online / offline / X pendentes.
- **Idempotência:** toda operação da fila tem UUID de operação; reenvio não duplica registro (upsert por `codigo` / constraint unique + tratamento de conflito 23505 como sucesso).
- **Alta carga:** inserções vão do cliente direto ao Supabase (sem gargalo em API própria); nada de N+1 no painel (agregações via uma query/view); Realtime para o painel com fallback para polling de 10s se o canal cair.

## Identidade visual

Tokens em `theme.ts` (única fonte da verdade):
- `azul` #3C8BD6 (marca), `azulEscuro` #1E5B94 (botões/títulos), `azulNoite` #153F68, `grafite` #232323, `claro` #F2F2F2, `fundo` #F3F6FA, `ok` #1E9E5A, `erro` #C93A3A.
- Logos em `/public/logo-wl-horizontal.svg` (fundos claros) e `/public/logo-wl-horizontal-clara.svg` (fundos escuros).
- Referência visual completa: `referencia/credenciamento-wl-prototipo.html` (protótipo aprovado pelo cliente — seguir o layout: formulário e comprovante centralizados em coluna única; gestão em duas colunas).
- Rodapé em todas as páginas: "Sistema desenvolvido por DS TecnoFisio".

## Qualidade / definição de pronto

- TypeScript estrito, sem `any` gratuito.
- Mobile-first: participante usa celular; recepção usa celular ou tablet.
- Toda operação de rede com estado de carregamento, erro tratado em português e retry.
- Textos da interface em português do Brasil.
- Testar o fluxo completo: inscrever (online e offline) → aparecer na recepção → check-in → refletir no painel → exportar CSV.
- Nunca commitar chaves: `.env.local` no `.gitignore`, `.env.example` versionado.

## Estrutura implementada (set/2026)

- Next 16: o antigo `middleware.ts` chama-se `src/proxy.ts` (protege `/gestao` via `getClaims`).
- `src/config/evento.ts` e `src/config/theme.ts`: únicas fontes de dados do cliente e de cores
  (o Tailwind 4 lê as variáveis `--wl-*` injetadas no layout).
- `src/lib/fila/fila.ts` + `src/lib/db/local.ts`: fila offline (IndexedDB via `idb`) com UUID por
  operação, backoff, gatilhos `online`/intervalo/visibilidade/Background Sync.
- `src/lib/gestao/base.ts`: base de inscritos em memória + cache local + Realtime + polling;
  o painel deriva tudo dela (`lib/gestao/painel.ts`) — uma consulta paginada alimenta recepção e painel.
- `public/sw.js`: service worker escrito à mão (sem plugin), precache das rotas e cache dos assets.
- `src/lib/database.types.ts`: gerado pela API do Supabase; regerar após mudar o schema.
- `tests/rls-anon.test.mjs`: prova que o anônimo só insere. `npm run verificar` roda tudo.
- Operação e deploy: `LEIA-ME.md`.
