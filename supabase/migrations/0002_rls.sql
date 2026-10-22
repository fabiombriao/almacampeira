-- Alma Campeira: RLS, grants e Storage

alter table public.admins enable row level security;
alter table public.store_settings enable row level security;
alter table public.integration_secrets enable row level security;
alter table public.banners enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_attempts enable row level security;
alter table public.tracking_events enable row level security;

-- ---------------------------------------------------------------- grants (RLS decide o resto)
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.store_settings, public.banners, public.categories, public.products,
  public.product_images, public.product_variants to anon;

grant select, insert, update, delete on public.store_settings, public.banners, public.categories,
  public.products, public.product_images, public.product_variants, public.coupons to authenticated;
grant select on public.admins, public.orders, public.order_items, public.order_status_history,
  public.tracking_events to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------- policies
create policy admins_self_read on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

create policy store_settings_read on public.store_settings for select to anon, authenticated
  using (true);
create policy store_settings_admin_write on public.store_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy banners_read on public.banners for select to anon, authenticated
  using (active or (select public.is_admin()));
create policy banners_admin_write on public.banners for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy categories_read on public.categories for select to anon, authenticated
  using (active or (select public.is_admin()));
create policy categories_admin_write on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy products_read on public.products for select to anon, authenticated
  using (active or (select public.is_admin()));
create policy products_admin_write on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy product_images_read on public.product_images for select to anon, authenticated
  using (true);
create policy product_images_admin_write on public.product_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy product_variants_read on public.product_variants for select to anon, authenticated
  using (
    (select public.is_admin())
    or (active and exists (select 1 from public.products p where p.id = product_id and p.active))
  );
create policy product_variants_admin_write on public.product_variants for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy coupons_admin_all on public.coupons for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy orders_admin_read on public.orders for select to authenticated
  using ((select public.is_admin()));
create policy order_items_admin_read on public.order_items for select to authenticated
  using ((select public.is_admin()));
create policy order_status_history_admin_read on public.order_status_history for select to authenticated
  using ((select public.is_admin()));
create policy tracking_events_admin_read on public.tracking_events for select to authenticated
  using ((select public.is_admin()));

-- integration_secrets e order_attempts: RLS ligado e nenhuma policy = só service role

-- ---------------------------------------------------------------- Storage (imagens do catálogo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists catalog_admin_insert on storage.objects;
drop policy if exists catalog_admin_update on storage.objects;
drop policy if exists catalog_admin_delete on storage.objects;

create policy catalog_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'catalog' and (select public.is_admin()));
create policy catalog_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()))
  with check (bucket_id = 'catalog' and (select public.is_admin()));
create policy catalog_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));
