-- Alma Campeira: schema base (catálogo, pedidos, configurações)

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- admins
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- ---------------------------------------------------------------- configurações públicas
create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Alma Campeira',
  tagline text not null default 'A essência do campo em cada detalhe',
  logo_url text not null default '/logo.jpg',
  whatsapp_number text not null default '5500000000000',
  message_template text not null default E'Olá! Gostaria de confirmar o pedido *#{numero_pedido}*:\n\n{itens}\n\n{cupom}*Total: {total}*\n\n*Cliente:* {nome}\n*Telefone:* {telefone}\n*Recebimento:* {recebimento}\n{endereco}{pagamento}{observacoes}\nAguardo seu retorno para combinarmos os detalhes!',
  business_hours text not null default 'Segunda a sábado, das 9h às 18h',
  pickup_address text not null default 'Endereço de retirada a definir',
  delivery_note text not null default 'O valor da entrega é combinado pelo WhatsApp, de acordo com o endereço.',
  instagram_url text not null default 'https://www.instagram.com/fgalmacampeira/',
  about_text text not null default 'Tradição que faz parte da sua história. Chimarrão, churrasco, moda gaúcha e personalização exclusiva.',
  privacy_text text not null default E'Usamos seu nome, telefone, e-mail e endereço apenas para atender o seu pedido e entrar em contato pelo WhatsApp.\n\nTambém podemos enviar dados do pedido a plataformas de anúncios (Meta e Google) para medir o resultado das nossas campanhas.\n\nPara corrigir ou apagar seus dados, fale com a gente pelo WhatsApp.',
  theme jsonb not null default '{"bg_dark":"#1F130D","primary":"#8C4A24","secondary":"#2E4A3A","accent":"#C8A27C","bg_light":"#F4ECE1","text":"#2A1D16"}',
  meta_pixel_id text,
  ga4_measurement_id text,
  updated_at timestamptz not null default now()
);

-- segredos de integração: SEM policy de leitura, só o servidor (service role) acessa
create table public.integration_secrets (
  id smallint primary key default 1 check (id = 1),
  meta_capi_token text,
  meta_test_event_code text,
  ga4_api_secret text,
  ads_customer_id text,
  ads_login_customer_id text,
  ads_conversion_action text,
  ads_developer_token text,
  ads_client_id text,
  ads_client_secret text,
  ads_refresh_token text,
  send_pii boolean not null default true,
  dry_run boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  subtitle text,
  link_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- catálogo
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  base_price numeric(10, 2) not null check (base_price >= 0),
  promo_price numeric(10, 2) check (promo_price is null or promo_price >= 0),
  option_names text[] not null default '{}',
  active boolean not null default true,
  featured boolean not null default false,
  is_demo boolean not null default false,
  allows_personalization boolean not null default false,
  personalization_label text not null default 'Texto para personalizar',
  personalization_required boolean not null default false,
  personalization_max_length int not null default 40 check (personalization_max_length between 1 and 200),
  personalization_fee numeric(10, 2) not null default 0 check (personalization_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

-- Todo produto tem ao menos uma variante (sem variações = variante única com option_values vazio).
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text,
  option_values jsonb not null default '{}',
  price numeric(10, 2) check (price is null or price >= 0),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  active boolean not null default true,
  sort_order int not null default 0
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(10, 2) not null check (value > 0),
  min_order numeric(10, 2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,
  used_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (type <> 'percent' or value <= 100)
);
create unique index coupons_code_key on public.coupons (lower(code));

-- ---------------------------------------------------------------- pedidos
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.order_number_seq'),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  fulfillment text not null check (fulfillment in ('pickup', 'delivery')),
  address jsonb not null default '{}',
  payment_preference text,
  notes text,
  subtotal numeric(10, 2) not null,
  discount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code text,
  status text not null default 'novo' check (status in ('novo', 'confirmado', 'entregue', 'cancelado')),
  stock_deducted boolean not null default false,
  event_id uuid not null default gen_random_uuid(),
  tracking jsonb not null default '{}',
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_id uuid,
  product_name text not null,
  variant_label text,
  unit_price numeric(10, 2) not null,
  personalization_text text,
  personalization_fee numeric(10, 2) not null default 0,
  quantity int not null check (quantity > 0),
  line_total numeric(10, 2) not null
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);

-- controle anti-spam (só o servidor acessa)
create table public.order_attempts (
  id bigint generated always as identity primary key,
  phone text not null,
  ip text,
  created_at timestamptz not null default now()
);

-- registro dos envios de conversão (Meta / Google)
create table public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  platform text not null,
  event_name text not null,
  status text not null check (status in ('sent', 'failed', 'skipped', 'dry_run')),
  detail text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- índices
create index products_category_idx on public.products (category_id);
create index products_active_featured_idx on public.products (active, featured);
create index product_images_product_idx on public.product_images (product_id, sort_order);
create index product_variants_product_idx on public.product_variants (product_id, sort_order);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);
create index order_attempts_phone_idx on public.order_attempts (phone, created_at desc);
create index order_attempts_ip_idx on public.order_attempts (ip, created_at desc);
create index tracking_events_order_idx on public.tracking_events (order_id, created_at desc);
create index banners_order_idx on public.banners (sort_order);

-- ---------------------------------------------------------------- triggers
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();
create trigger integration_secrets_updated_at before update on public.integration_secrets
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
