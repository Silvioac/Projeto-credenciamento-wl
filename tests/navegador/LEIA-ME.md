# Testes de navegador (Playwright)

Exercitam o app de ponta a ponta contra o Supabase real, como no dia do evento.

```bash
npx playwright install chromium            # uma vez
npm run dev                                # em outro terminal (ou BASE_URL de um deploy)

SUPABASE_ACCESS_TOKEN=sbp_... node tests/navegador/publico.mjs
SUPABASE_ACCESS_TOKEN=sbp_... EMAIL=equipe@... SENHA=... node tests/navegador/gestao.mjs
```

- `publico.mjs`: inscrição online, validação, máscara, impressão só do comprovante,
  service worker, inscrição offline → sincronização sem duplicar, recarga offline, proxy.
- `gestao.mjs`: login, busca, check-in por botão e por código, "já registrado", cadastro na
  porta, painel em tempo real (check-in "de outro aparelho"), CSV com BOM, recepção offline
  → sincronização, sair.

O token pessoal (Supabase → Account → Access Tokens) serve só para conferir e apagar os
registros de teste; nunca vai para o app. Capturas de tela ficam em `capturas/` (ignorada no git).
