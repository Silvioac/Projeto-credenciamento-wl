# LEIA-ME — Sistema de Credenciamento · WL Experience 2026

Sistema desenvolvido pela **DS TecnoFisio** para inscrição e check-in de participantes.
Este guia explica como operar no dia do evento, como publicar e como reaproveitar para outros eventos.

## Endereços

| Página | Quem usa | Para quê |
|---|---|---|
| `/inscricao` | Público (link do QR de divulgação) | Cadastro → credencial digital com QR + comprovante |
| `/gestao` | Equipe (login) | Aba **Recepção** (check-in, cadastro na porta) e aba **Painel** (métricas, exportar CSV) |
| `/gestao/login` | Equipe | Entrar com e-mail e senha |

## Antes do evento

### 1. Criar os usuários da equipe (recepção e organização)

No painel do Supabase: **Authentication → Users → Add user → Create new user**.
Preencha e-mail e senha e marque **Auto Confirm User**. Crie um usuário por pessoa ou por
tablet da recepção (facilita revogar depois). Só quem tem login consegue ver a base de dados.

### 2. Desligar o cadastro público de contas (obrigatório)

**Authentication → Sign In / Providers → Email → desmarque "Allow new users to sign up"**.
Sem isso, qualquer pessoa com a chave pública poderia criar uma conta e ler os dados dos
participantes (a chave pública é visível no site, por definição).

### 3. Conferir a segurança

```bash
npm run test:rls
```

Esse teste usa a chave pública e prova que o anônimo consegue **apenas** se inscrever:
não lê, não conta, não altera, não apaga e não se cadastra como presente. Deve passar 8/8.

### 4. Testar o fluxo completo

Inscreva-se pelo celular em `/inscricao` → abra `/gestao` em outro aparelho → o nome aparece
na Recepção → confirme a entrada (câmera ou botão) → o Painel atualiza em até 2 s → exporte o CSV.

## No dia do evento

### Recepção (celular ou tablet)

1. Abra `/gestao` **com internet** e faça login pelo menos uma vez. A base é copiada para o
   aparelho (IndexedDB) e a página fica disponível mesmo sem rede.
2. No Android/Chrome ou iPhone/Safari use **"Adicionar à tela inicial"** para instalar o app.
3. **Ler QR code pela câmera**: toque no botão azul, aponte para a credencial. A confirmação
   aparece grande na tela com o nome. Leituras repetidas mostram "Já registrado às HH:MM".
4. **Sem QR**: digite nome, e-mail ou código na busca e toque em **Confirmar entrada**.
   Digitar o código completo (ex.: `WL-A1B2C3`) e apertar Enter faz o check-in direto.
5. **Cadastro rápido na porta**: para quem chegou sem inscrição. Entra já como presente.

### Se a internet cair

- O indicador no topo mostra **Offline** e o número de operações **pendentes**.
- Busca, check-in e cadastro na porta continuam funcionando com a cópia local.
- Tudo é reenviado sozinho quando a rede volta (evento `online`, tentativas com espera
  crescente e intervalo de 30 s). Toque no indicador para forçar o envio.
- Nada é duplicado: cada operação tem um identificador único e o servidor trata reenvios
  como sucesso.
- Inscrições feitas pelo público sem rede também ficam guardadas no celular do participante
  e sobem quando ele recuperar sinal. A credencial dele já vale desde o primeiro momento,
  porque o código é gerado no próprio aparelho.

### Painel da organização

Aba **Painel**: presentes agora, inscritos no total, comparecimento, cadastros na porta,
gráfico por profissão (barra clara = inscritos, escura = presentes) e as últimas entradas.
Atualiza em tempo real; se o canal cair, atualiza a cada 20 s.

### Ao final: exportar a base

**Painel → Exportar CSV (base completa)**. O arquivo usa `;` como separador e UTF-8 com BOM,
abre direto no Excel em português com acentos corretos. Colunas: código, nome, telefone,
profissão, e-mail, presente, hora de entrada, origem, data da inscrição, id.
A base pertence à WL Atacadista; o CSV também pode ser gerado pelo painel do Supabase
(**Table Editor → inscritos → Export**).

## Publicar (Vercel)

1. Suba o projeto para um repositório Git (GitHub, GitLab ou Bitbucket). O `.gitignore` já
   impede o envio de `.env.local`.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
   Framework detectado: Next.js. Build: `next build` (padrão). Não mude nada.
3. Em **Environment Variables**, adicione (Production, Preview e Development):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://fcbpcrakjakyagcvbxqq.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a chave *publishable* (`sb_publishable_…`) em
     Supabase → Project Settings → API Keys
4. **Deploy**. Em 1–2 minutos o site fica em `https://<nome>.vercel.app`.
5. **Domínio próprio**: Vercel → Project → Settings → Domains → Add → digite
   `evento.seudominio.com.br`. A Vercel mostra o registro DNS a criar no provedor do domínio
   (normalmente um `CNAME` apontando para `cname.vercel-dns.com`). HTTPS é automático.
6. No Supabase, em **Authentication → URL Configuration**, coloque o domínio final em
   **Site URL** e em **Redirect URLs**.
7. Divulgue `https://<domínio>/inscricao` no QR code do material gráfico.

Cada `git push` na branch principal gera um novo deploy automaticamente.

## Teste manual do modo offline (DevTools)

1. Abra `/inscricao` no Chrome, F12 → aba **Application → Service Workers**: deve aparecer
   `sw.js` ativo.
2. Aba **Network** → marque **Offline**.
3. Preencha e confirme uma inscrição. A credencial e o comprovante aparecem normalmente,
   com o aviso amarelo "será confirmada automaticamente" e o indicador **Offline · 1 pendente**.
4. Em **Application → IndexedDB → credenciamento → fila** está a operação guardada.
5. Recarregue a página ainda offline: ela abre pelo service worker.
6. Desmarque **Offline**. Em poucos segundos o aviso muda para "Conexão restabelecida" e a
   fila esvazia. Confira a linha em Supabase → Table Editor → inscritos.
7. Repita na Recepção: offline, confirme uma entrada e faça um cadastro na porta; ao voltar
   a rede, ambos sobem sem duplicar.

Para testar a versão de produção localmente: `npm run build && npm run start`.

## Reaproveitar em outro evento

Nada do restante do código conhece a WL. Basta trocar:

- `src/config/evento.ts` — nome, edição, data, local, prefixo do código (`WL` → outro),
  profissões do formulário, textos do rodapé.
- `src/config/theme.ts` — cores (uma única fonte da verdade; o Tailwind lê daqui).
- `public/logo-wl-horizontal.svg` e `public/logo-wl-horizontal-clara.svg` — logos
  (ou aponte outros caminhos em `evento.ts`). Regere os ícones em `public/icons/` se quiser.
- Um projeto Supabase novo com `schema.sql` executado e um `.env.local` novo.

## Comandos

```bash
npm install          # dependências
npm run dev          # desenvolvimento em http://localhost:3000
npm run build        # build de produção
npm run start        # serve o build
npm run verificar    # typecheck + lint + teste de RLS
npm run test:rls     # só o teste de segurança
```

## Estrutura do banco

`schema.sql` cria a tabela `inscritos`, as políticas de RLS, os índices, o Realtime e duas
views (`painel_resumo`, `painel_profissoes`) úteis para consultas SQL no painel do Supabase.
Execute-o uma única vez em **SQL Editor** num projeto novo; a seção de views pode ser
reexecutada.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| "E-mail ou senha incorretos" | Confirme o usuário em Authentication → Users (Auto Confirm). |
| Câmera não abre | Permita o acesso à câmera no navegador; o site precisa estar em HTTPS (a Vercel já é). Use a busca por nome enquanto isso. |
| Indicador preso em "pendentes" | Toque nele para forçar o envio. Se persistir, confira a internet do aparelho; nada se perde. |
| Painel diz "Tempo real indisponível" | Normal em redes restritas; ele atualiza a cada 20 s mesmo assim. |
| Precisa apagar registros de teste | Supabase → Table Editor → inscritos → filtre por e-mail/nome e apague. |
