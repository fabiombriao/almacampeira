-- Fotos próprias de cada variação (ex.: cada cuia única com suas fotos). Vazio = usa as fotos do produto.
alter table public.product_variants
  add column if not exists image_urls text[] not null default '{}';
