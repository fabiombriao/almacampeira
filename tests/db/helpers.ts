import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ quiet: true })

export const hasDb = Boolean(process.env.SUPABASE_DB_PASSWORD && process.env.SUPABASE_PROJECT_URL)

export function newClient() {
  const ref = new URL(process.env.SUPABASE_PROJECT_URL!).hostname.split('.')[0]
  return new pg.Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  })
}

/** Roda o teste dentro de uma transação que SEMPRE sofre rollback (não deixa lixo no banco). */
export async function inTransaction(fn: (c: pg.Client) => Promise<void>) {
  const client = newClient()
  await client.connect()
  try {
    await client.query('begin')
    await fn(client)
  } finally {
    await client.query('rollback').catch(() => {})
    await client.end()
  }
}

const adminIds = new WeakMap<pg.Client, string>()

export async function asAdmin(c: pg.Client) {
  let id = adminIds.get(c)
  if (!id) {
    const { rows } = await c.query(
      `insert into auth.users (id, email) values (gen_random_uuid(), 'teste-admin@example.com') returning id`,
    )
    id = rows[0].id as string
    await c.query('insert into public.admins (user_id) values ($1)', [id])
    adminIds.set(c, id)
  }
  await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: id, role: 'authenticated' })])
  await c.query('set local role authenticated')
  return id
}

export async function backToOwner(c: pg.Client) {
  await c.query('reset role')
}

export const TEST_COUPON = 'TESTE10'

const seeded = new WeakSet<pg.Client>()

/**
 * Cria, dentro da transação do teste (sofre rollback), produtos e cupom próprios.
 * Os testes não dependem dos produtos de exemplo, que o dono apaga, nem mexem nos dados reais.
 */
async function ensureFixtures(c: pg.Client) {
  if (seeded.has(c)) return
  seeded.add(c)
  await c.query(`
    insert into public.products
      (name, slug, base_price, promo_price, option_names, allows_personalization, personalization_required, personalization_max_length, personalization_fee)
    values
      ('T Kit',    't-kit',    189.90, 169.90, array['Cor'],     true,  false, 20, 25.00),
      ('T Cuia',   't-cuia',    89.90, null,   array['Tamanho'], true,  false, 24, 12.00),
      ('T Faca',   't-faca',   219.00, 199.00, array[]::text[],  true,  true,  18, 15.00),
      ('T Camisa', 't-camisa', 149.90, null,   array['Tamanho'], false, false, 20, 0),
      ('T Brinco', 't-brinco',  59.90, null,   array[]::text[],  false, false, 20, 0)`)
  await c.query(`
    insert into public.product_variants (product_id, sku, option_values, price, stock_quantity, sort_order)
    select p.id, v.sku, v.opt::jsonb, v.price, v.stock, v.ord
      from public.products p
      join (values
        ('t-kit',    'T-KIT-NAT', '{"Cor":"Natural"}',  null::numeric, 10, 1),
        ('t-cuia',   'T-CUI-P',   '{"Tamanho":"P"}',    79.90,         8,  1),
        ('t-cuia',   'T-CUI-G',   '{"Tamanho":"G"}',    109.90,        0,  2),
        ('t-faca',   'T-FAC-UN',  '{}',                 null,          5,  1),
        ('t-camisa', 'T-CAM-P',   '{"Tamanho":"P"}',    null,          5,  1),
        ('t-camisa', 'T-CAM-G',   '{"Tamanho":"G"}',    null,          3,  2),
        ('t-brinco', 'T-BRI-UN',  '{}',                 null,          15, 1)
      ) as v(slug, sku, opt, price, stock, ord) on v.slug = p.slug`)
  await c.query(`insert into public.coupons (code, type, value, min_order, active) values ($1, 'percent', 10, 100, true)`, [TEST_COUPON])
}

/** Busca a variante de teste pelo SKU (ex.: 'KIT-NAT' → 'T-KIT-NAT'). */
export async function variantId(c: pg.Client, sku: string) {
  await ensureFixtures(c)
  const { rows } = await c.query('select id from public.product_variants where sku = $1', [`T-${sku}`])
  return rows[0].id as string
}

export function orderPayload(items: unknown[], extra: Record<string, unknown> = {}) {
  return {
    customer: { name: 'Cliente Teste', phone: '(51) 99999-0000', email: 'cliente@example.com' },
    fulfillment: 'pickup',
    address: {},
    items,
    tracking: { ip: `10.0.0.${Math.floor(Math.random() * 250)}` },
    is_test: true,
    ...extra,
  }
}
