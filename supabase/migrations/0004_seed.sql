-- Alma Campeira: dados iniciais (configuração, categorias e produtos de exemplo)

insert into public.store_settings (id) values (1) on conflict (id) do nothing;
insert into public.integration_secrets (id) values (1) on conflict (id) do nothing;

insert into public.categories (name, slug, sort_order) values
  ('Chimarrão', 'chimarrao', 1),
  ('Churrasco', 'churrasco', 2),
  ('Moda Gaúcha', 'moda-gaucha', 3),
  ('Acessórios', 'acessorios', 4)
on conflict (slug) do nothing;

-- Produtos de EXEMPLO (is_demo = true). O dono apaga pelo admin: Produtos > "Remover itens de exemplo".
insert into public.products
  (category_id, name, slug, description, base_price, promo_price, option_names, featured, is_demo,
   allows_personalization, personalization_label, personalization_required, personalization_max_length, personalization_fee)
select c.id, v.name, v.slug, v.description, v.base_price, v.promo_price, v.option_names, v.featured, true,
       true, v.plabel, v.preq, v.pmax, v.pfee
from (values
  ('chimarrao', 'Kit Chimarrão Campeiro (exemplo)', 'kit-chimarrao-campeiro-exemplo',
   'Cuia, bomba e suporte em couro. Produto de exemplo para testar a loja.',
   189.90::numeric, 169.90::numeric, array['Cor']::text[], true, true, 'Nome para gravar na cuia', false, 20, 25.00::numeric),
  ('chimarrao', 'Cuia de Porongo Premium (exemplo)', 'cuia-porongo-premium-exemplo',
   'Cuia de porongo curada, acabamento artesanal. Produto de exemplo.',
   89.90, null, array['Tamanho']::text[], true, true, 'Texto da gravação', false, 24, 12.00),
  ('churrasco', 'Tábua de Corte Rústica (exemplo)', 'tabua-corte-rustica-exemplo',
   'Tábua de madeira maciça para servir e cortar. Produto de exemplo.',
   129.90, null, array['Tamanho']::text[], true, true, 'Frase ou nome para gravar', false, 40, 0),
  ('churrasco', 'Faca Campeira Gravada (exemplo)', 'faca-campeira-gravada-exemplo',
   'Faca com cabo em madeira e bainha de couro. A gravação é obrigatória. Produto de exemplo.',
   219.00, 199.00, array[]::text[], false, true, 'Nome para gravar na lâmina', true, 18, 15.00),
  ('moda-gaucha', 'Camisa Xadrez Gaúcha (exemplo)', 'camisa-xadrez-gaucha-exemplo',
   'Camisa em tecido leve, estampa xadrez. Produto de exemplo.',
   149.90, null, array['Tamanho']::text[], true, true, 'Texto', false, 20, 0),
  ('acessorios', 'Brinco Flor Dourada (exemplo)', 'brinco-flor-dourada-exemplo',
   'Brinco banhado, inspirado nas flores do campo. Produto de exemplo.',
   59.90, null, array[]::text[], false, true, 'Texto', false, 20, 0)
) as v(cat, name, slug, description, base_price, promo_price, option_names, featured, _d, plabel, preq, pmax, pfee)
join public.categories c on c.slug = v.cat
on conflict (slug) do nothing;

-- apenas os produtos com gravação ligam a personalização
update public.products set allows_personalization = false
 where is_demo and slug in ('camisa-xadrez-gaucha-exemplo', 'brinco-flor-dourada-exemplo');
update public.products set allows_personalization = true
 where is_demo and slug in ('kit-chimarrao-campeiro-exemplo', 'cuia-porongo-premium-exemplo',
                            'tabua-corte-rustica-exemplo', 'faca-campeira-gravada-exemplo');

insert into public.product_images (product_id, url, sort_order)
select p.id, '/demo/' || replace(p.slug, '-exemplo', '') || '.svg', 0
  from public.products p
 where p.is_demo
   and not exists (select 1 from public.product_images i where i.product_id = p.id);

insert into public.product_variants (product_id, sku, option_values, price, stock_quantity, sort_order)
select p.id, v.sku, v.opt::jsonb, v.price, v.stock, v.ord
from public.products p
join (values
  ('kit-chimarrao-campeiro-exemplo', 'KIT-NAT', '{"Cor":"Natural"}', null::numeric, 10, 1),
  ('kit-chimarrao-campeiro-exemplo', 'KIT-PRE', '{"Cor":"Preto"}',   null,          4, 2),
  ('cuia-porongo-premium-exemplo',   'CUI-P',   '{"Tamanho":"P"}',   79.90,         8, 1),
  ('cuia-porongo-premium-exemplo',   'CUI-M',   '{"Tamanho":"M"}',   null,          12, 2),
  ('cuia-porongo-premium-exemplo',   'CUI-G',   '{"Tamanho":"G"}',   109.90,        0, 3),
  ('tabua-corte-rustica-exemplo',    'TAB-40',  '{"Tamanho":"40 cm"}', null,        6, 1),
  ('tabua-corte-rustica-exemplo',    'TAB-50',  '{"Tamanho":"50 cm"}', 159.90,      3, 2),
  ('faca-campeira-gravada-exemplo',  'FAC-UN',  '{}',                null,          5, 1),
  ('camisa-xadrez-gaucha-exemplo',   'CAM-P',   '{"Tamanho":"P"}',   null,          5, 1),
  ('camisa-xadrez-gaucha-exemplo',   'CAM-M',   '{"Tamanho":"M"}',   null,          7, 2),
  ('camisa-xadrez-gaucha-exemplo',   'CAM-G',   '{"Tamanho":"G"}',   null,          3, 3),
  ('camisa-xadrez-gaucha-exemplo',   'CAM-GG',  '{"Tamanho":"GG"}',  null,          0, 4),
  ('brinco-flor-dourada-exemplo',    'BRI-UN',  '{}',                null,          15, 1)
) as v(slug, sku, opt, price, stock, ord) on v.slug = p.slug
where not exists (select 1 from public.product_variants x where x.product_id = p.id);

insert into public.coupons (code, type, value, min_order, active)
values ('BEMVINDO10', 'percent', 10, 100, true)
on conflict do nothing;
