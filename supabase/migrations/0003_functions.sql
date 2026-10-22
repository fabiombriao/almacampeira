-- Alma Campeira: regras de negócio críticas (create_order e change_order_status)

-- ---------------------------------------------------------------- create_order
-- Só o servidor (service role) chama. Recalcula tudo a partir do banco: o navegador nunca define preço.
-- Não baixa estoque (isso acontece quando o dono confirma), só confere disponibilidade.
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p #>> '{customer,name}', ''));
  v_phone text := regexp_replace(coalesce(p #>> '{customer,phone}', ''), '\D', '', 'g');
  v_email text := nullif(btrim(coalesce(p #>> '{customer,email}', '')), '');
  v_fulfillment text := coalesce(p ->> 'fulfillment', '');
  v_address jsonb := coalesce(p -> 'address', '{}'::jsonb);
  v_ip text := nullif(p #>> '{tracking,ip}', '');
  v_code text := nullif(btrim(coalesce(p ->> 'coupon_code', '')), '');
  v_test boolean := coalesce((p ->> 'is_test')::boolean, false);
  v_item jsonb;
  v_row record;
  v_qty int;
  v_ptext text;
  v_fee numeric(10, 2);
  v_unit numeric(10, 2);
  v_label text;
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_total numeric(10, 2);
  v_coupon record;
  v_coupon_id uuid;
  v_coupon_code text;
  v_lines jsonb := '[]'::jsonb;
  v_short record;
  v_order_id uuid := gen_random_uuid();
  v_number bigint;
  v_event uuid;
begin
  if jsonb_typeof(p -> 'items') is distinct from 'array'
     or jsonb_array_length(p -> 'items') = 0
     or jsonb_array_length(p -> 'items') > 50 then
    raise exception 'dados_invalidos:itens';
  end if;


  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'dados_invalidos:quantidade';
    end if;

    select v.id as variant_id, v.option_values, v.price as variant_price,
           pr.id as product_id, pr.name, pr.base_price, pr.promo_price,
           pr.allows_personalization, pr.personalization_required,
           pr.personalization_max_length, pr.personalization_fee
      into v_row
      from public.product_variants v
      join public.products pr on pr.id = v.product_id
     where v.id = (v_item ->> 'variant_id')::uuid
       and v.active and pr.active;
    if not found then
      raise exception 'item_indisponivel';
    end if;

    -- preço: o da variante (se houver) vale; senão promo; senão base
    v_unit := coalesce(v_row.variant_price, v_row.promo_price, v_row.base_price);

    v_ptext := nullif(btrim(coalesce(v_item ->> 'personalization_text', '')), '');
    v_fee := 0;
    if v_row.allows_personalization then
      if v_ptext is null and v_row.personalization_required then
        raise exception 'personalizacao_obrigatoria:%', v_row.name;
      end if;
      if v_ptext is not null then
        if length(v_ptext) > v_row.personalization_max_length then
          raise exception 'personalizacao_longa:%', v_row.name;
        end if;
        v_fee := v_row.personalization_fee;
      end if;
    else
      v_ptext := null;
    end if;

    select string_agg(e.value, ' / ' order by e.key) into v_label
      from jsonb_each_text(v_row.option_values) e;

    v_subtotal := v_subtotal + (v_unit + v_fee) * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'variant_id', v_row.variant_id,
      'product_id', v_row.product_id,
      'product_name', v_row.name,
      'variant_label', v_label,
      'unit_price', v_unit,
      'personalization_text', v_ptext,
      'personalization_fee', v_fee,
      'quantity', v_qty,
      'line_total', (v_unit + v_fee) * v_qty
    );
  end loop;

  -- disponibilidade agregada (mesma variante em linhas diferentes)
  select pr.name into v_short
    from (
      select (l ->> 'variant_id')::uuid as vid, sum((l ->> 'quantity')::int) as q
        from jsonb_array_elements(v_lines) l
       group by 1
    ) s
    join public.product_variants v on v.id = s.vid
    join public.products pr on pr.id = v.product_id
   where v.stock_quantity < s.q
   limit 1;
  if found then
    raise exception 'estoque_insuficiente:%', v_short.name;
  end if;

  if v_code is not null then
    select * into v_coupon
      from public.coupons c
     where lower(c.code) = lower(v_code)
       and c.active
       and (c.starts_at is null or c.starts_at <= now())
       and (c.ends_at is null or c.ends_at >= now())
       and (c.max_uses is null or c.used_count < c.max_uses);
    if not found then
      raise exception 'cupom_invalido';
    end if;
    if v_subtotal < v_coupon.min_order then
      raise exception 'cupom_minimo:%', v_coupon.min_order;
    end if;
    v_discount := case
      when v_coupon.type = 'percent' then round(v_subtotal * v_coupon.value / 100, 2)
      else least(v_coupon.value, v_subtotal)
    end;
    v_coupon_id := v_coupon.id;
    v_coupon_code := v_coupon.code;
  end if;

  v_total := v_subtotal - v_discount;

  -- cotação: devolve as linhas e totais calculados, sem gravar nada
  if coalesce((p ->> 'dry_run')::boolean, false) then
    return jsonb_build_object('dry_run', true, 'lines', v_lines, 'subtotal', v_subtotal,
      'discount', v_discount, 'total', v_total, 'coupon_code', v_coupon_code);
  end if;

  if v_name = '' or length(v_name) > 120 then
    raise exception 'dados_invalidos:nome';
  end if;
  if length(v_phone) < 10 or length(v_phone) > 13 then
    raise exception 'dados_invalidos:telefone';
  end if;
  if v_fulfillment not in ('pickup', 'delivery') then
    raise exception 'dados_invalidos:recebimento';
  end if;
  if v_fulfillment = 'delivery' and (
    coalesce(btrim(v_address ->> 'street'), '') = ''
    or coalesce(btrim(v_address ->> 'number'), '') = ''
    or coalesce(btrim(v_address ->> 'district'), '') = ''
    or coalesce(btrim(v_address ->> 'city'), '') = ''
  ) then
    raise exception 'dados_invalidos:endereco';
  end if;
  -- anti-spam: no máximo 5 pedidos em 10 minutos por telefone ou IP
  if (
    select count(*) from public.order_attempts a
    where a.created_at > now() - interval '10 minutes'
      and (a.phone = v_phone or (v_ip is not null and a.ip = v_ip))
  ) >= 5 then
    raise exception 'muitas_tentativas';
  end if;


  insert into public.orders (
    id, customer_name, customer_phone, customer_email, fulfillment, address,
    payment_preference, notes, subtotal, discount, total, coupon_id, coupon_code,
    tracking, is_test
  ) values (
    v_order_id, v_name, v_phone, v_email, v_fulfillment, v_address,
    nullif(btrim(coalesce(p ->> 'payment_preference', '')), ''),
    nullif(btrim(coalesce(p ->> 'notes', '')), ''),
    v_subtotal, v_discount, v_total,
    v_coupon_id, v_coupon_code,
    coalesce(p -> 'tracking', '{}'::jsonb), v_test
  ) returning number, event_id into v_number, v_event;

  insert into public.order_items (
    order_id, variant_id, product_id, product_name, variant_label, unit_price,
    personalization_text, personalization_fee, quantity, line_total
  )
  select v_order_id, (l ->> 'variant_id')::uuid, (l ->> 'product_id')::uuid, l ->> 'product_name',
         l ->> 'variant_label', (l ->> 'unit_price')::numeric, l ->> 'personalization_text',
         (l ->> 'personalization_fee')::numeric, (l ->> 'quantity')::int, (l ->> 'line_total')::numeric
    from jsonb_array_elements(v_lines) l;

  insert into public.order_status_history (order_id, from_status, to_status)
  values (v_order_id, null, 'novo');

  insert into public.order_attempts (phone, ip) values (v_phone, v_ip);

  return jsonb_build_object(
    'id', v_order_id,
    'number', v_number,
    'event_id', v_event,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'total', v_total
  );
end
$$;

-- ---------------------------------------------------------------- change_order_status
-- Chamada pelo admin logado (is_admin()). Transições válidas:
--   novo -> confirmado (baixa estoque), confirmado -> entregue,
--   novo -> cancelado, confirmado -> cancelado (devolve estoque e cupom)
create or replace function public.change_order_status(p_order_id uuid, p_new text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_stock int;
begin
  if not public.is_admin() then
    raise exception 'nao_autorizado';
  end if;
  if p_new not in ('confirmado', 'entregue', 'cancelado') then
    raise exception 'transicao_invalida:%', p_new;
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'pedido_nao_encontrado';
  end if;
  if v_order.status = p_new then
    return to_jsonb(v_order);
  end if;

  if v_order.status = 'novo' and p_new = 'confirmado' then
    for v_item in
      select oi.variant_id, sum(oi.quantity)::int as qty, min(oi.product_name) as pname
        from public.order_items oi
       where oi.order_id = p_order_id and oi.variant_id is not null
       group by oi.variant_id
       order by oi.variant_id
    loop
      select pv.stock_quantity into v_stock
        from public.product_variants pv where pv.id = v_item.variant_id for update;
      if not found then
        continue;
      end if;
      if v_stock < v_item.qty then
        raise exception 'estoque_insuficiente:%', v_item.pname;
      end if;
      update public.product_variants
         set stock_quantity = stock_quantity - v_item.qty
       where id = v_item.variant_id;
    end loop;
    if v_order.coupon_id is not null then
      update public.coupons set used_count = used_count + 1 where id = v_order.coupon_id;
    end if;
    update public.orders
       set status = 'confirmado', stock_deducted = true, confirmed_at = now()
     where id = p_order_id;

  elsif v_order.status = 'confirmado' and p_new = 'entregue' then
    update public.orders set status = 'entregue', delivered_at = now() where id = p_order_id;

  elsif v_order.status = 'novo' and p_new = 'cancelado' then
    update public.orders set status = 'cancelado', cancelled_at = now() where id = p_order_id;

  elsif v_order.status = 'confirmado' and p_new = 'cancelado' then
    if v_order.stock_deducted then
      for v_item in
        select oi.variant_id, sum(oi.quantity)::int as qty
          from public.order_items oi
         where oi.order_id = p_order_id and oi.variant_id is not null
         group by oi.variant_id
         order by oi.variant_id
      loop
        update public.product_variants
           set stock_quantity = stock_quantity + v_item.qty
         where id = v_item.variant_id;
      end loop;
    end if;
    if v_order.coupon_id is not null then
      update public.coupons set used_count = greatest(used_count - 1, 0) where id = v_order.coupon_id;
    end if;
    update public.orders
       set status = 'cancelado', stock_deducted = false, cancelled_at = now()
     where id = p_order_id;

  else
    raise exception 'transicao_invalida:%->%', v_order.status, p_new;
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, changed_by)
  values (p_order_id, v_order.status, p_new, (select auth.uid()));

  return (select to_jsonb(o) from public.orders o where o.id = p_order_id);
end
$$;

-- ---------------------------------------------------------------- permissões das funções
revoke all on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

revoke all on function public.change_order_status(uuid, text) from public, anon;
grant execute on function public.change_order_status(uuid, text) to authenticated;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
