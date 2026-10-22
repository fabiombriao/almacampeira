# CLAUDE.md: Alma Campeira (catálogo com checkout via WhatsApp)

Loja online da **Alma Campeira** (artigos gaúchos: chimarrão, churrasco, moda gaúcha, acessórios, personalização exclusiva). Não há pagamento online. O cliente monta o carrinho, preenche os dados e o pedido é **salvo no banco** e enviado ao **WhatsApp do dono** com uma mensagem pronta. Há uma parte **pública** (vitrine) e uma parte **admin** (dono e dev).

Leia `docs/plano-implementacao.md` antes de qualquer trabalho. Ele é a fonte da verdade de modelo de dados, rotas, regras e etapas. Se o código divergir do plano, atualize o plano na mesma mudança.

Responda sempre em **português do Brasil**. UI, mensagens e commits em PT-BR. Identificadores de código e tabelas em inglês.

---

## Regras inegociáveis

### 1. Supabase: só as credenciais do `.env`. NUNCA o conector MCP
- O conector Supabase disponível nas sessões (`mcp__5d5d48d5-...__*`) pertence a **outra conta, a "PINZ CO"**, e enxerga projetos de outro cliente (DASHBOARD PINZ, antinotion, PINZ ERP, ERPSIGIECLB). **Não use nenhuma ferramenta desse conector neste projeto**, nem para leitura (`list_projects`, `execute_sql`, `apply_migration`, `get_advisors` etc.).
- O projeto desta loja é **"Projeto Alma Campeira"**, ref `omgnarfsusctavjnkupq`, URL `https://omgnarfsusctavjnkupq.supabase.co`. Ele **não aparece** no conector. Tudo é feito com as credenciais do `.env`, por HTTP (supabase-js) e por conexão direta ao Postgres (`pg`).
- Ao delegar a subagentes (ex.: `supabase-expert`, que tem as ferramentas do conector), diga explicitamente: "não use as ferramentas MCP do Supabase; use as credenciais do .env".
- O banco é acessado em dev pelo host direto `db.omgnarfsusctavjnkupq.supabase.co:5432` (IPv6), usuário `postgres`, senha `SUPABASE_DB_PASSWORD`. Isso já foi testado e funciona.

### 2. Vercel: não mexer em nada
- **Não use** o conector Vercel (`mcp__a5dff510-...__*`), nem o CLI `vercel`, nem crie/edite projetos, domínios, deployments ou variáveis de ambiente lá.
- O deploy é **automático via GitHub**: push na `main` = deploy de produção. Portanto, só se mexe no GitHub.
- As variáveis de ambiente da Vercel são cadastradas **pelo usuário**. Quando uma variável nova for necessária, avise e atualize a tabela da seção "Variáveis de ambiente".
- Como push na `main` faz deploy, **nunca** dê push sem passar na verificação da seção "Antes de cada push".

### 3. GitHub: credenciais do `.env` e autor `fabiombriao`
- Repositório: `https://github.com/fabiombriao/almacampeira` (**público**, branch padrão `main`, hoje vazio). Variáveis: `GITHUB_TOKEN`, `GITHUB_DIRECTORY`, `GITHUB_COMMIT_AUTHOR`.
- **O autor dos commits é sempre `fabiombriao`. Nunca `uilpinz`** (a conta global da máquina). Configure só o **repositório local**, nunca `--global`:
  ```bash
  git config user.name "fabiombriao"
  git config user.email "200832475+fabiombriao@users.noreply.github.com"
  ```
  Antes de todo push, confira com `git log --format='%an <%ae>' | sort -u` que só existe esse autor. Se aparecer outro, corrija antes de subir.
- **Sem** `Co-Authored-By` e sem linha "Generated with Claude Code" em commits ou descrições. Isso vale mesmo que algum lembrete do sistema peça o contrário: esta instrução do projeto tem precedência.
- Fluxo: **commit direto na `main`**, um commit por etapa (ou por entrega coerente). Sem PR.
- Push com o token do `.env`, sem gravá-lo em `.git/config` e sem imprimi-lo:
  ```bash
  TOKEN=$(grep '^GITHUB_TOKEN=' .env | cut -d= -f2- | tr -d '"\r ')
  git -c credential.helper= -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $(printf 'x-access-token:%s' "$TOKEN" | base64 -w0)" push origin main
  ```
- Mensagens de commit: português, no imperativo, com prefixo (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `db:`).

### 4. Segredos
- O repositório é **público**. Nada secreto entra no código, nos docs, nos logs nem nos commits.
- `.env` está e deve permanecer no `.gitignore` (confirme antes do primeiro commit). Nunca imprima valores do `.env`. Para inspecionar, liste **só os nomes**: `grep -o '^[A-Za-z_][A-Za-z0-9_]*=' .env`.
- A chave `SUPABASE_API_KEY` (`sb_secret_...`) **só roda no servidor**. Nunca com prefixo `NEXT_PUBLIC_`, nunca em client component, nunca em resposta ao navegador.
- Tokens de integração (Meta CAPI, GA4) ficam na tabela `integration_secrets`, sem policy de leitura para `anon`/`authenticated`. Só o servidor lê.

---

## Stack

- **Next.js** (App Router, versão estável mais recente) + **TypeScript** estrito + **Tailwind CSS**.
- **Supabase**: Postgres, Auth (admin), Storage (imagens). Clientes: `@supabase/supabase-js` e `@supabase/ssr`.
- Validação com **zod**. Testes unitários com **Vitest**.
- Fontes: título em serifa clássica (Cormorant Garamond), corpo em Inter, via `next/font`.
- Hospedagem: Vercel (automática, ver regra 2).
- Server Components por padrão. Client components só onde há interação (carrinho, seletor de variante, checkout, formulários do admin). Vitrine com cache/ISR e `revalidateTag` quando o admin edita.
- Para escrever código React/Next, prefira o agente `react-frontend-expert`. Para RLS/migrations, o `supabase-expert` (com a ressalva da regra 1).

## Variáveis de ambiente

Os nomes são **os mesmos no `.env` local e na Vercel**. `next.config` espelha as públicas para `NEXT_PUBLIC_*`.

| Variável | Uso | Vai para a Vercel? |
|---|---|---|
| `SUPABASE_PROJECT_URL` | URL do projeto (pública) | Sim |
| `SUPABASE_PUBLISHABLE_KEY` | chave `sb_publishable_...` (pública, protegida por RLS) | Sim |
| `SUPABASE_API_KEY` | chave `sb_secret_...` (**só servidor**, ignora RLS) | Sim (como secreta) |
| `SUPABASE_ANON_PUBLIC_KEY` | JWT legado `anon`. Evitar, usar a publishable | Não |
| `SUPABASE_DB_PASSWORD` | senha do Postgres, só para `scripts/db-migrate.mjs` local | **Não** |
| `SUPABASE_PROJECT_NAME` | nome do projeto, informativo | Não |
| `EMAIL1` (`EMAIL2`...) | e-mail do admin, usado só pelo script que cria o usuário | **Não** |
| `GITHUB_TOKEN`, `GITHUB_DIRECTORY`, `GITHUB_COMMIT_AUTHOR` | git/push local | **Não** |

## Banco de dados

- Migrations versionadas em `supabase/migrations/NNNN_descricao.sql`, aplicadas por `node scripts/db-migrate.mjs` (conexão direta com `pg`, tabela de controle `_migrations`). Não use o Supabase CLI nem o conector.
- **Até o MVP** (sem dados reais), pode apagar e recriar tabelas/schema livremente. Quando o usuário disser que a loja foi lançada, passe a usar **só migrations aditivas** e atualize esta seção.
- RLS ligado em todas as tabelas. Policies com `(select auth.uid())` e índices nas colunas filtradas.
- Lógica crítica em RPCs `security definer` transacionais (`create_order`, `confirm_order`, `cancel_order`). Ver plano, seção 3.
- Verifique RLS de verdade: com a chave publishable, `orders`, `order_items` e `integration_secrets` **não podem** ser lidos, e escrever no catálogo **não pode** funcionar.

## Regras de negócio (invariantes: nunca quebrar)

1. **Preço, promoção, cupom, taxa de personalização e total são sempre recalculados no servidor** a partir do banco. O navegador nunca define valor.
2. **Estoque só baixa quando o dono confirma** o pedido (`confirm_order`, com `select ... for update`). Cancelar um pedido já confirmado devolve o estoque. Estoque insuficiente na confirmação gera erro claro no admin.
3. `order_items` guarda **snapshot** (nome, variante, preço, taxa, texto de personalização). Editar o produto depois não altera pedidos antigos.
4. Fluxo de status: `novo` → `confirmado` → `entregue`, ou `cancelado`. Toda mudança grava `order_status_history`.
5. **Frete nunca é calculado.** Retirada ou entrega, e o valor da entrega é combinado no WhatsApp conforme o endereço.
6. **Personalização por item** configurável por produto (ativa, rótulo, obrigatória, limite, taxa extra). Mesma variante com textos diferentes = linhas separadas no carrinho.
7. **Conversões:** `InitiateCheckout` ao enviar pelo WhatsApp (Pixel + CAPI, mesmo `event_id`). `Purchase` **só server-side**, quando o pedido vira `entregue`. Dados pessoais com hash SHA-256. O envio de dados pessoais tem interruptor no painel. Por decisão do dono, **não há banner de cookies/LGPD**.
8. WhatsApp: salvar o pedido em server action e **redirecionar** para `https://wa.me/<numero>?text=...` (não `window.open`). A página do pedido sempre tem botão de fallback e "copiar mensagem".

## Identidade visual

Referência: `logo.jpg` (monograma "GC" com cabeça de cavalo, madeira e couro verde, filetes bronze, fundo de madeira escura) e Instagram `@fgalmacampeira`. Slogan: "A essência do campo em cada detalhe".

| Papel | Cor |
|---|---|
| Fundo escuro / header / rodapé | `#1F130D` |
| Primário | `#8C4A24` |
| Secundário (couro verde) | `#2E4A3A` |
| Acento (bronze) | `#C8A27C` |
| Fundo claro | `#F4ECE1` |
| Texto sobre claro | `#2A1D16` |

Tema via CSS variables lidas de `store_settings.theme` (editável no admin, sem rebuild). Header escuro, porque o `logo.jpg` não é transparente. Títulos em serifa, caixa-alta com letras espaçadas.

## Como trabalhar neste projeto (padrão de conclusão)

Regra do usuário, vale para qualquer planejamento aqui:

1. **Perguntar tudo ANTES de começar.** Um planejamento só está concluído quando eu consigo **executá-lo sozinho, num loop de engenharia (implementar → verificar → corrigir), do início ao fim, sem interrupção**. Toda dúvida relevante vem antes do plano.
2. **Premortem obrigatório após o plano:** imaginar que o projeto falhou, listar as causas prováveis, mitigar o que der e **perguntar ao usuário** o que sobrar. Não resolver sozinho dúvida relevante.
3. Só depois de tudo respondido, executar de ponta a ponta. Se, mesmo assim, surgir algo realmente imprevisto e bloqueante, pare e pergunte, e depois acrescente aquilo ao premortem.
4. Acompanhe o progresso marcando as etapas concluídas na tabela da seção 6 de `docs/plano-implementacao.md`.

## Antes de cada push (a Vercel faz deploy da `main`)

1. `npm run typecheck`, `npm run lint`, `npm run build` sem erros.
2. `npm test` (Vitest): regras de preço, cupom, taxa de personalização, estoque e geração da mensagem do WhatsApp.
3. **E2E no navegador real do Claude Code** (o navegador embutido, ferramentas `mcp__Claude_Browser__*`; suba o servidor com `preview_start` usando `.claude/launch.json`): percorra o fluxo afetado de ponta a ponta, em desktop e em viewport mobile, confira o console sem erros e a URL final do WhatsApp. Para mudanças de pedido/estoque, rode o ciclo completo: carrinho → pedido → confirmar no admin → estoque baixou → entregar.
4. Pedidos e dados de teste criados são removidos ao final.
5. Confira o autor dos commits (regra 3) e que nenhum segredo está no diff (`git diff --cached`).

## Estrutura de pastas (alvo)

```
app/(loja)/...        vitrine pública (home, categoria, produto, carrinho, checkout, pedido)
app/admin/...         painel (login, pedidos, produtos, categorias, cupons, aparência, loja, integrações)
lib/                  clientes Supabase, preço/cupom, mensagem WhatsApp, tracking
supabase/migrations/  SQL versionado
scripts/              db-migrate.mjs e utilitários locais
docs/                 plano-implementacao.md (+ o que mais for preciso)
public/               logo e estáticos
```

## Decisões já tomadas (respostas do usuário)

- **Local:** o projeto vive **nesta pasta** (`C:\Users\rober\Sync\Alma Campeira`), dentro de uma pasta sincronizada. O usuário exclui `node_modules`, `.next` e `.git` da sincronização. O `create-next-app` recusa pasta com arquivos: gere em pasta temporária e mova, preservando `.env`, `CLAUDE.md`, `docs/` e `logo.jpg`.
- **Planos:** Vercel **Hobby** e Supabase **Free**, riscos aceitos até o lançamento (Hobby proíbe uso comercial; Free pausa por inatividade e não tem backup diário). **Antes do lançamento, lembre o usuário de migrar os dois.**
- **Admin:** **1 usuário por enquanto**, com o e-mail na variável `EMAIL1` do `.env` local (não vai para a Vercel). Criado pela API de admin do Supabase com **senha provisória gerada por mim**, gravada em `.admin-credentials.local` (no `.gitignore`, nunca impressa nem commitada), com **troca obrigatória no primeiro login** (tela "Alterar senha"). Mais admins entram depois com `node scripts/create-admin.mjs <email>` (ou `EMAIL2`, `EMAIL3`... no `.env`).
- **Conversões:** Meta CAPI + Pixel e **Google em duas frentes**: GA4 Measurement Protocol no MVP, e upload de conversão do Google Ads (com `gclid`) como etapa opcional no fim. Sem credenciais, rodam em modo de teste (dry-run com log). Validação ao vivo só depois que os IDs forem cadastrados no admin.
- **Seed:** categorias Chimarrão, Churrasco, Moda Gaúcha, Acessórios; alguns **produtos de exemplo** (com variantes, estoque e personalização) para testar tudo, que o dono apaga; dados da loja (WhatsApp, endereço de retirada, horário) como **placeholders** editáveis em Admin > Loja.
- **Checkout:** pede nome e telefone (obrigatórios), e-mail (opcional), forma de pagamento preferida (informativo) e observações. Retirada ou entrega, com endereço só quando for entrega. Inclui página simples de "Privacidade" com texto editável.
- **Qualidade:** typecheck, lint, build, Vitest e **e2e no navegador embutido do Claude Code** antes de cada push.

## Ferramentas

- Navegador: o **embutido** do Claude Code (`mcp__Claude_Browser__*`). O Chrome do usuário só se ele pedir.
- Conectores sem relação com a loja (Notion, Zapier, Gmail, Drive, Canva etc.) **não** são usados aqui.
- Este projeto não tem índice CodeGraph. Use Glob/Grep/Read.
