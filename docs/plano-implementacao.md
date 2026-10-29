# Plano de implementação: catálogo com checkout via WhatsApp

## 1. Visão

Catálogo estilo e-commerce, sem pagamento online. O cliente monta o carrinho e preenche os dados. O pedido é salvo no banco e o WhatsApp do dono abre com a mensagem pronta (itens, valores, dados do cliente). Quem confirma, combina frete e recebe é o dono, pela conversa.

## 2. Decisões já tomadas

| Tema | Decisão |
|---|---|
| Frontend | Next.js (App Router, React 19), loja pública e admin no mesmo projeto |
| Backend | Supabase: Postgres, Auth, Storage |
| Hospedagem | Vercel |
| Escopo | Loja única |
| Catálogo | Produtos com variações e controle de estoque |
| Entrega | Cliente escolhe retirada ou entrega. Frete sempre combinado no WhatsApp (sem cálculo no carrinho) |
| Pedido | Registrado no banco ao clicar em enviar. Status: `novo` → `confirmado` → `entregue` / `cancelado` |
| Estoque | Baixa **só quando o dono confirma** o pedido. Cancelar um pedido confirmado devolve o estoque |
| Admin | **1 usuário por enquanto** (e-mail em `EMAIL1` no `.env`). Estrutura pronta para mais admins, mesmo nível de acesso |
| Conversões | Meta CAPI e Google. `InitiateCheckout` ao enviar pelo WhatsApp; `Purchase` quando o pedido vira `entregue` (server-side) |
| Consentimento | Sem banner de cookies/LGPD por decisão do dono (ver riscos) |

## 3. Modelo de dados (Supabase)

Todas as tabelas com RLS ligado. Leitura pública só do que a vitrine precisa; escrita só para admins.

**Configuração**
- `store_settings` (linha única): nome, logo, `whatsapp_number`, `message_template`, `business_hours` (jsonb), `theme` (jsonb: cores), redes sociais, textos institucionais.
- `integration_secrets` (linha única): IDs e tokens de Meta (pixel id, CAPI token, test code), GA4 (measurement id, api secret) e Google Ads. **Sem policy de leitura para `anon`/`authenticated`**: só o servidor lê, com service role.
- `banners`: imagem, link, ordem, ativo.
- `admins`: `user_id` → função `is_admin()` usada em todas as policies de escrita.

**Catálogo**
- `categories`: nome, slug, ordem, ativa.
- `products`: nome, slug, descrição, `category_id`, preço base, preço promocional, ativo, destaque, e configuração de personalização: `allows_personalization` (bool), `personalization_label` (ex.: "Nome a gravar"), `personalization_required` (bool), `personalization_max_length`, `personalization_fee` (valor extra por unidade personalizada; `0` = sem custo, configurável produto a produto).
- `product_images`: `product_id`, caminho no Storage, ordem.
- `product_options` / `product_variants`: ex.: Tamanho e Cor. Cada variante tem SKU, valores das opções, preço (opcional, sobrescreve o base), `stock_quantity`, ativo e `image_urls` (fotos da galeria do produto ligadas a ela, uma ou várias; migration 0005). Na loja o vínculo vale nos dois sentidos: escolher a variação leva à primeira foto dela, e clicar numa foto ligada a uma variação a seleciona (`lib/gallery.ts`, `components/product-selection.tsx`).

**Vendas**
- `coupons`: código, tipo (`percent` / `fixed`), valor, pedido mínimo, validade, limite de usos, `used_count`, ativo.
- `orders`: número sequencial legível, dados do cliente, `fulfillment` (`pickup` / `delivery`), endereço (jsonb), observações, subtotal, desconto, total, cupom, status, `stock_deducted` (bool), `event_id` (deduplicação), contexto de tracking (`fbp`, `fbc`, `gclid`, GA `client_id`, user agent, IP), timestamps.
- `order_items`: **snapshot** do nome, variante, preço unitário, quantidade, `personalization_text` (nulo se não houver) e `personalization_fee` aplicada no momento do pedido.
- `order_status_history`: quem mudou, de/para, quando.

**RPCs (security definer, transacionais)**
- `create_order(payload)`: recalcula tudo no servidor a partir do banco (preço, promo, cupom, total). **Nunca confia no preço vindo do navegador.** Faz só checagem de disponibilidade, sem baixar estoque. Retorna número do pedido.
- `confirm_order(id)`: em uma transação, dá `select ... for update` nas variantes, falha se algum estoque for insuficiente, decrementa, marca `stock_deducted`, incrementa `used_count` do cupom.
- `cancel_order(id)`: se `stock_deducted`, devolve o estoque.

## 4. Rotas

**Público**
- `/` home (banners, destaques, categorias)
- `/categoria/[slug]` listagem com filtros e paginação por keyset
- `/produto/[slug]` seleção de variante, estoque, galeria
- `/carrinho` e `/checkout` (dados do cliente, retirada/entrega, cupom)
- `/pedido/[numero]` confirmação, com botão de fallback "abrir WhatsApp"

**Admin** (`/admin/*`, protegido por middleware **e** por RLS)
- `login`, dashboard, `pedidos` (+ detalhe), `produtos` (+ editor de variantes), `categorias`, `cupons`, `aparencia`, `loja` (WhatsApp e horário), `integracoes`

## 5. Pontos técnicos importantes

- **Carrinho** no cliente (localStorage), revalidado no servidor ao criar o pedido. Se algo mudou de preço ou acabou, o checkout avisa antes de enviar.
- **WhatsApp:** salvar o pedido em uma server action e redirecionar para `https://wa.me/<numero>?text=<mensagem>`. Redirecionar em vez de `window.open` evita bloqueio de popup no Safari/iOS. A página do pedido mantém o botão de fallback.
- **Personalização por item:** na página do produto, se `allows_personalization`, aparece um campo de texto com o rótulo configurado (obrigatório ou opcional, com limite de caracteres). O texto fica na linha do carrinho. Mesma variante com textos diferentes vira **linhas separadas**, e a mesma variante com o mesmo texto soma a quantidade. `create_order` valida tamanho e obrigatoriedade no servidor e sanitiza o texto. Aparece no detalhe do pedido no admin e na mensagem do WhatsApp (ex.: `Caneca — 1x — Personalização: "João"`). Se o produto tiver `personalization_fee` maior que zero, a taxa é somada ao preço da unidade **somente quando o cliente preenche o texto**, e o carrinho mostra a taxa em linha separada. O cálculo final é sempre refeito no servidor.
- **Mensagem:** gerada a partir do `message_template` do admin, com variáveis (`{itens}`, `{total}`, `{nome}`, `{endereco}`, `{numero_pedido}`). Cada item lista a personalização quando houver.
- **Performance:** vitrine com Server Components e cache (ISR/`revalidateTag`), invalidado quando o admin edita catálogo ou configurações. Só o carrinho, seletor de variante e checkout são client components. Imagens via `next/image` com Storage do Supabase.
- **Aparência:** tema por CSS variables lidas de `store_settings.theme`, sem rebuild.
- **Conversões:**
  - `InitiateCheckout`: Pixel no navegador + CAPI no servidor com o mesmo `event_id`.
  - `Purchase`: apenas server-side, no momento em que o status vira `entregue`, usando o contexto guardado no pedido. Dados pessoais enviados com hash SHA-256.
  - Google: começar por GA4 Measurement Protocol. Google Ads (conversão offline com `gclid`) exige developer token e aprovação, então fica como etapa opcional ao final.
- **Segurança:** policies RLS com `(select auth.uid())` e índices nas colunas usadas. Rate limit na criação de pedido (anti-spam). Upload de imagem restrito a admins.

## 6. Etapas de entrega

| # | Etapa | Entrega | Status |
|---|---|---|---|
| 0 | Setup | Projeto Next.js, Tailwind, projeto Supabase, variáveis de ambiente, repositório | ✅ |
| 1 | Banco | Migrations, RLS, `is_admin()`, RPCs, seed de exemplo | ✅ testado (10 testes no banco) |
| 2 | Admin base | Login, layout, tela de Loja/WhatsApp, troca de senha obrigatória | ✅ |
| 3 | Catálogo (admin) | Categorias, produtos, variantes, upload de imagens | ✅ e2e com upload real |
| 4 | Vitrine | Home, categoria, produto, carrinho | ✅ e2e desktop e mobile |
| 5 | Checkout | Formulário, `create_order`, redirecionamento ao WhatsApp, página do pedido | ✅ e2e (mensagem conferida) |
| 6 | Pedidos (admin) | Lista, detalhe, confirmar/cancelar/entregar, baixa de estoque | ✅ e2e (estoque 10 → 9) |
| 7 | Cupons | CRUD no admin + aplicação no checkout | ✅ e2e |
| 8 | Aparência | Tema, banners, textos | ✅ (telas renderizam; edição coberta pelo código, sem e2e) |
| 9 | Conversões | Pixel + CAPI Meta, GA4 MP, Google Ads (opcional), painel de integrações | ✅ código e testes de hash. **Sem validação ao vivo** (faltam IDs/tokens) |
| 10 | Deploy e QA | Vercel, domínio, teste ponta a ponta no celular | ⏳ push feito; Vercel é com você (ver seção 11) |

As etapas 0 a 6 formam o **MVP vendável**. Cupons, aparência e conversões entram depois sem retrabalho no núcleo.

## 7. Riscos e pontos de atenção

- **Sem banner de consentimento:** enviar telefone e e-mail (mesmo com hash) para Meta e Google sem consentimento é um risco de LGPD. Decisão do dono, registrada aqui. O envio de dados pessoais nas conversões pode ser ligado ou desligado no painel de integrações, para facilitar uma mudança futura.
- **Concorrência de estoque:** como a baixa é na confirmação, dois pedidos podem pedir a última unidade. O primeiro a ser confirmado vence e o segundo recebe erro claro no admin. É o comportamento esperado.
- **Segredos:** tokens de CAPI ficam em tabela sem acesso público e nunca vão ao navegador.
- **Spam de pedidos:** exige rate limit e validação de telefone.

## 8. Identidade visual (referência: Instagram @fgalmacampeira)

Referência: print do perfil e o arquivo `logo.jpg` (1254×1254) na raiz do projeto. As cores abaixo foram **estimadas a olho** a partir do logo e podem ser refinadas com um conta-gotas depois.

- **Marca:** "Alma Campeira". Logo é um monograma "GC" entrelaçado com cabeça de cavalo. As letras têm textura de madeira marrom e **couro verde-musgo**, com filetes em bronze/ouro rosado, sobre fundo de madeira escura. O nome vem em caixa-alta espaçada, com um ornamento e o slogan embaixo.
- **Arquivo do logo:** o `logo.jpg` tem o fundo de madeira embutido e **não é transparente**. Serve para tela escura (header/hero/rodapé) e para a imagem de compartilhamento (OG). Para uso sobre fundo claro e para o favicon, o ideal é um PNG/SVG com fundo transparente, que dá para pedir ao designer depois. No MVP, o header da loja fica escuro para casar com o JPG.
- **Slogans:** "Tradição que faz parte da sua história" (bio) e "A essência do campo em cada detalhe" (usado nas artes).
- **Clima:** rústico premium. Madeira, couro, tons terrosos, fundo escuro com detalhes dourados. Fotos com luz quente.
- **Paleta proposta** (vira `store_settings.theme`, editável no admin):

| Papel | Cor aproximada |
|---|---|
| Fundo escuro / header / rodapé | `#1F130D` (madeira escura do logo) |
| Primário (botões, destaques) | `#8C4A24` (madeira cobre do "T" do monograma) |
| Secundário (selos, "em estoque", detalhes) | `#2E4A3A` (couro verde do "G") |
| Acento (filetes, preço promo, ícones) | `#C8A27C` (bronze/ouro rosado do contorno) |
| Fundo claro das páginas | `#F4ECE1` (creme) |
| Texto sobre claro | `#2A1D16` |

- **Tipografia:** títulos com serifa elegante, de preferência uma fonte clássica do Google Fonts (ex.: Cormorant Garamond ou Playfair Display), com corpo em sans legível (ex.: Inter). Títulos em caixa-alta com espaçamento de letras, como no logo.
- **Categorias iniciais (seed),** tiradas da bio: Chimarrão, Churrasco, Moda Gaúcha. As fotos mostram também acessórios (brincos, colares) e queima de estofados/utilidades, então vale confirmar a lista final.
- **Personalização exclusiva:** a bio destaca esse serviço. Ver pendência 4.

## 9. Pendências para começar

1. ~~Logo~~ **Recebido** (`logo.jpg`). Opcional: versão com fundo transparente.
2. ~~Supabase~~ **Resolvido e testado:** projeto "Projeto Alma Campeira" (`omgnarfsusctavjnkupq`), vazio (0 tabelas). A conexão direta ao Postgres com `SUPABASE_DB_PASSWORD` funciona, e `SUPABASE_API_KEY` é uma chave `sb_secret_`. Migrations vão por `scripts/db-migrate.mjs` (pg), sem CLI e sem o conector da PINZ CO. Não precisa de `SUPABASE_ACCESS_TOKEN`.
3. ~~Repositório GitHub~~ **Resolvido e testado:** `fabiombriao/almacampeira`, público, vazio, branch `main`, token com permissão de push. Commits direto na `main`, autor `fabiombriao`, sem Co-Authored-By.
4. ~~Personalização~~ **Decidido:** incluída por item, com taxa configurável por produto (ver seção 5).
5. ~~Fotos~~ **Decidido:** o catálogo nasce com itens de exemplo (imagens genéricas geradas por mim) e o dono cadastra os reais pelo admin.

## 10. Premortem (feito após o plano)

Exercício: "daqui a um mês o projeto falhou ou travou. Por quê?"

| # | Risco | Mitigação | Status |
|---|---|---|---|
| 1 | Vercel **Hobby proíbe uso comercial**: a conta pode ser suspensa com a loja no ar | Usar plano Pro | **Respondido:** Hobby por enquanto. Risco aceito até o lançamento, com lembrete de migrar |
| 2 | Supabase **Free pausa o projeto** após ~1 semana sem atividade e não tem backup diário | Plano Pro, ou aceitar o risco | **Respondido:** Free por enquanto. Risco aceito até o lançamento, com lembrete de migrar |
| 3 | Projeto na pasta `Sync`: `node_modules`, `.next` e `.git` sincronizando milhares de arquivos, com conflitos e travamentos | Criar fora do Sync, ou excluir essas pastas da sincronização | **Respondido:** criar aqui; o usuário exclui `node_modules`, `.next` e `.git` do sync |
| 4 | Convite por e-mail ao admin depende de Site URL/redirect no painel do Supabase (que não consigo configurar sem token) e do SMTP padrão, que é limitado | Criar os 2 usuários pela API com senha provisória gerada, salva em arquivo local ignorado pelo git, com troca obrigatória no 1º login | **Respondido:** senha provisória. E-mail em `EMAIL1` no `.env` (1 admin por enquanto) |
| 5 | "API de conversões do Google" não é uma só: GA4 Measurement Protocol é simples; Google Ads (upload de conversão) exige developer token, OAuth e aprovação | Escolher qual | **Respondido:** os dois. GA4 no MVP, Google Ads como etapa opcional no fim |
| 6 | Ainda não há Pixel/CAPI/GA4 para testar ao vivo | Modo de teste (dry-run com log) e testes unitários do payload. Validação real quando os IDs forem colocados no admin | Assumido |
| 7 | Mensagem do WhatsApp com muitos itens estoura o limite da URL | Mensagem compacta. Acima do limite, resumo + link `/pedido/<numero>` + botão "copiar mensagem" | Assumido |
| 8 | Pedidos falsos / spam | Rate limit no banco (por telefone e IP), campo honeypot, validação de telefone | Assumido |
| 9 | Duas confirmações disputando a última unidade | `confirm_order` com `for update`; o segundo recebe erro claro | Coberto |
| 10 | Preço adulterado pelo navegador | Servidor recalcula tudo em `create_order` | Coberto |
| 11 | Segredo vazando em repositório público | `.env` no `.gitignore`, secret key só no servidor, checagem de `git diff --cached` antes do push | Coberto |
| 12 | Commit com autor errado (`uilpinz`) | Config só local, checagem do autor antes de todo push | Coberto |
| 13 | Deploy quebrado na `main` | Verificação pré-push com build, testes e e2e. A Vercel ainda não está conectada, então nada é publicado até lá | Coberto |
| 14 | Imagens pesadas deixam a loja lenta | Redimensionar no navegador antes do upload (máx. ~1600px, WebP), bucket público, `next/image` | Assumido |
| 15 | Envio de dados pessoais às plataformas sem consentimento | Decisão do dono, com interruptor no painel. Inclui uma página simples de "Privacidade" com texto editável | Assumido |
| 16 | Teste e2e deixa lixo no banco | Dados de teste marcados e removidos ao final de cada rodada | Assumido |

## 11. O que colocar na Vercel quando for para produção

A Vercel é conectada por você ao repositório `fabiombriao/almacampeira` (deploy automático a cada push na `main`). Nada é feito nela por mim.

Em **Project Settings > Environment Variables** (ambiente Production, e Preview se quiser), cadastre exatamente estas 3:

| Nome | Valor | Observação |
|---|---|---|
| `SUPABASE_PROJECT_URL` | o mesmo do `.env` (`https://omgnarfsusctavjnkupq.supabase.co`) | público |
| `SUPABASE_PUBLISHABLE_KEY` | o mesmo do `.env` (`sb_publishable_...`) | público, protegida por RLS |
| `SUPABASE_API_KEY` | o mesmo do `.env` (`sb_secret_...`) | **secreta, só servidor. Marque como Sensitive** |

Opcional: `NEXT_PUBLIC_SITE_URL` com o endereço final (ex.: `https://www.seudominio.com.br`), usada em sitemap e compartilhamento. Sem ela, o site usa o domínio de produção que a própria Vercel informa.

**Não** cadastre: `SUPABASE_DB_PASSWORD`, `SUPABASE_ANON_PUBLIC_KEY`, `SUPABASE_PROJECT_NAME`, `EMAIL1`, nem nada de `GITHUB_*`. O banco já está pronto (migrations aplicadas), então a Vercel só precisa dessas 3.

Depois de conectar:
1. Faça o primeiro deploy e abra `/admin/login`. Entre com o e-mail do `EMAIL1` e a senha provisória do arquivo `.admin-credentials.local`. A troca de senha é obrigatória.
2. Em **Loja e WhatsApp**, cadastre o número real, endereço de retirada e horário (hoje são placeholders).
3. Em **Produtos**, remova os itens de exemplo e cadastre os reais.
4. Em **Integrações**, cadastre Pixel/GA4 e tokens. Para testar a Meta, use o código de evento de teste.
5. Lembrete: Vercel Hobby proíbe uso comercial e Supabase Free pausa por inatividade (ver premortem, riscos 1 e 2).

## 12. Campanha do bazar (link de grupo do WhatsApp)

- Rota `GET /bazar` (`app/bazar/route.ts`): redireciona (302) para o grupo configurado em Admin > Loja (`store_settings.group_url`, migration 0006). Só aceita https do WhatsApp (`lib/group.ts`). Sem link configurado, volta para a home.
- Evento: **`Lead`** (padrão da Meta; um evento personalizado só do servidor demora a ser listado nas campanhas e exige conversão personalizada, e a regra por URL da Meta nunca dispara porque o /bazar não abre página), enviado pelo **servidor** à Meta (CAPI) no momento do clique, porque a pessoa sai do site na hora (`dispatchGroupEvent` em `lib/tracking/server.ts`). Sem dados pessoais: só IP, navegador, `_fbp` e `fbc` (cookie `_fbc` ou montado do `fbclid`).
- Robôs de pré-visualização (WhatsApp, Facebook, Google) e pedidos HEAD redirecionam mas **não contam**.
- Cada clique grava uma linha em `tracking_events` (sem pedido); o painel inicial mostra os cliques dos últimos 7 dias.
- O WhatsApp não avisa quando alguém **entra**: o evento mede o **clique**. Comparar com o crescimento de participantes do grupo.
- Usar no anúncio: `https://<site>/bazar`.
