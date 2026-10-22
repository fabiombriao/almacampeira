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

export async function variantId(c: pg.Client, sku: string) {
  const { rows } = await c.query('select id from public.product_variants where sku = $1', [sku])
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
