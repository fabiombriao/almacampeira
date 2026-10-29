-- Link do grupo de WhatsApp usado pela rota /bazar (editável em Admin > Loja). Vazio = /bazar volta para a home.
alter table public.store_settings
  add column if not exists group_url text not null default '';
