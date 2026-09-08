# PROMPTS.md — Sequência para o Claude Code

Use um prompt por vez, na ordem. Só passe pro próximo quando o critério de aceite da fase
estiver funcionando. O arquivo `CLAUDE.md` deve estar na raiz do projeto antes de começar —
o Claude Code lê ele automaticamente e absorve todo o contexto.

---

## Fase 1 — Fundação

> Leia o CLAUDE.md e o schema.sql na raiz. Crie o projeto Next.js com App Router, TypeScript
> e Tailwind conforme a stack definida. Configure o cliente Supabase (variáveis em
> .env.local, com .env.example versionado), crie o arquivo theme.ts com os tokens de cor da
> identidade visual e o arquivo de configuração do evento (nome, data, local, caminhos das
> logos) para o sistema ser reaproveitável em outros eventos. Monte o layout base com
> cabeçalho (logo WL + título do evento) e rodapé DS TecnoFisio. Crie a rota / redirecionando
> para /inscricao com uma página placeholder. Me diga quais comandos rodar e o que preencher
> no .env.local.

**Aceite:** projeto roda com `npm run dev`, layout base aparece com logo e cores certas.

---

## Fase 2 — Página pública de inscrição

> Implemente a página /inscricao seguindo o layout do protótipo em
> referencia/credenciamento-wl-prototipo.html (coluna única centralizada). Formulário com
> nome completo, telefone com máscara brasileira, profissão (select com as opções do
> protótipo) e e-mail, com validação em português. Ao confirmar: gerar o código WL-XXXXXX no
> cliente conforme a regra do CLAUDE.md, inserir no Supabase, e exibir a credencial digital
> (gradiente azul, logo clara, QR code contendo o código) seguida do comprovante de inscrição
> (nº, dados, data/hora, nota explicativa) com botão de imprimir que imprime somente o
> comprovante. Tratar erro de rede com mensagem clara e botão de tentar de novo — a fila
> offline vem na fase 3, por enquanto só não pode falhar silenciosamente.

**Aceite:** inscrição real aparece na tabela do Supabase; credencial e comprovante idênticos
ao protótipo; impressão sai só o comprovante.

---

## Fase 3 — Offline e sincronização (inscrição)

> Transforme o app em PWA instalável e implemente a resiliência da página /inscricao conforme
> a seção Resiliência do CLAUDE.md: fila de inscrições em IndexedDB quando o envio falhar,
> credencial e comprovante entregues normalmente mesmo offline, banner discreto de pendência,
> sincronização automática ao voltar a conexão com retry e backoff, idempotência por código
> (conflito de unique tratado como sucesso). Adicione um indicador de status de conexão.
> Escreva também um pequeno teste manual documentado: como simular offline no DevTools e
> verificar a fila sincronizando.

**Aceite:** com o DevTools em modo offline, a inscrição completa funciona e o registro chega
ao Supabase sozinho quando a rede volta, sem duplicar.

---

## Fase 4 — Área de gestão: login e recepção

> Implemente /gestao com autenticação Supabase (e-mail e senha, sessão persistente,
> middleware protegendo a rota). Dentro dela, a aba Recepção seguindo o protótipo: busca por
> nome ou código, lista com status (presente às HH:MM / botão confirmar entrada), check-in
> idempotente conforme o CLAUDE.md, e o cadastro rápido na porta (origem 'porta', presente
> imediato). Adicione leitura de QR code pela câmera do celular (biblioteca html5-qrcode ou
> @zxing/browser): ao ler o código da credencial, faz o check-in direto e mostra confirmação
> grande com o nome do participante — a recepcionista precisa conferir de relance.

**Aceite:** login funciona e bloqueia acesso deslogado; check-in por câmera, por busca e
cadastro de porta refletem no banco.

---

## Fase 5 — Offline na recepção

> Estenda a resiliência para a área de recepção conforme o CLAUDE.md: cache da lista de
> inscritos em IndexedDB com sincronização periódica, fila offline para check-ins e cadastros
> de porta com UUID de operação e sincronização automática, contador visível de operações
> pendentes. A busca e o check-in por câmera devem funcionar com a base em cache mesmo sem
> internet.

**Aceite:** derrubando a rede, a recepção continua buscando e registrando entradas; ao voltar
a rede, tudo sincroniza sem duplicatas.

---

## Fase 6 — Painel da organização

> Implemente a aba Painel em /gestao seguindo o protótipo: métricas (presentes agora,
> inscritos no total, % de comparecimento, cadastros na porta), gráfico de barras por
> profissão, feed das últimas entradas. Atualização em tempo real via Supabase Realtime com
> fallback automático para polling de 10 segundos se o canal cair. Botão "Exportar CSV" que
> baixa a base completa (todas as colunas, separador ponto e vírgula, codificação UTF-8 com
> BOM para abrir certo no Excel brasileiro).

**Aceite:** um check-in feito em outro aparelho aparece no painel em até 2s (ou 10s no
fallback); CSV abre corretamente no Excel com acentos.

---

## Fase 7 — Endurecimento e deploy

> Revisão final: confirme que as políticas RLS do schema.sql estão aplicadas e que o cliente
> anônimo não consegue ler a base (escreva um teste que tenta e falha); estados de
> carregamento e erro em toda chamada de rede; acessibilidade básica (foco visível, labels,
> contraste); meta tags e título por página. Prepare o deploy na Vercel: me passe o passo a
> passo de variáveis de ambiente, build e como apontar um domínio próprio. Por fim, gere um
> LEIA-ME.md em português explicando como operar o sistema no dia do evento (criar usuários
> da equipe, abrir a recepção, exportar a base ao final).

**Aceite:** app no ar na Vercel com domínio, teste de leitura anônima falhando, LEIA-ME
completo.

---

## Depois do deploy

Com o link definitivo no ar (ex.: `evento.seudominio.com.br/inscricao`), me mande o link
aqui no chat que eu gero a arte do QR code de divulgação para o material gráfico do evento.
