# Testes de navegador (Playwright)

Exercitam o app de ponta a ponta contra o Supabase real, como no dia do evento.

```bash
npx playwright install chromium            # uma vez
npm run dev                                # em outro terminal

export SUPABASE_ACCESS_TOKEN=sbp_...
export BASE_URL=https://credenciamento-wl.vercel.app   # ou omita para usar localhost:3000

node tests/navegador/publico.mjs
EMAIL=equipe@... SENHA=... node tests/navegador/gestao.mjs
EMAIL=equipe@... SENHA=... node tests/navegador/dois-aparelhos.mjs
```

- `publico.mjs`: inscrição online, validação, máscara, impressão só do comprovante,
  service worker, inscrição offline → sincronização sem duplicar, recarga offline, proxy.
- `gestao.mjs`: login, busca, check-in por botão e por código, "já registrado", cadastro na
  porta, painel em tempo real (check-in "de outro aparelho"), CSV com BOM, recepção offline
  → sincronização, sair.
- `dois-aparelhos.mjs`: dois navegadores logados ao mesmo tempo; o check-in feito num
  aparece no outro sem recarregar e a segunda tentativa responde "Já registrado".

**Prefira rodar contra o endereço publicado.** Service worker e câmera só funcionam em
HTTPS ou em `localhost`; pelo IP da rede local eles ficam desligados pelo navegador.

O token pessoal (Supabase → Account → Access Tokens) serve só para conferir e apagar os
registros de teste; nunca vai para o app. Capturas de tela ficam em `capturas/` (ignorada no git).
