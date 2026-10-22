// Aplica supabase/migrations/*.sql no Postgres do "Projeto Alma Campeira" por conexão direta.
// NÃO usa o conector MCP do Supabase (conta PINZ CO) nem o Supabase CLI.
// Uso:  node scripts/db-migrate.mjs            aplica as migrations pendentes
//       node scripts/db-migrate.mjs --reset    recria o schema public do zero (só até o MVP!)
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env'), quiet: true })

const url = process.env.SUPABASE_PROJECT_URL
const password = process.env.SUPABASE_DB_PASSWORD
if (!url || !password) {
  console.error('Faltam SUPABASE_PROJECT_URL e/ou SUPABASE_DB_PASSWORD no .env')
  process.exit(1)
}
const ref = new URL(url).hostname.split('.')[0]

export function connect() {
  return new pg.Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  })
}

const client = connect()
await client.connect()

if (process.argv.includes('--reset')) {
  console.log('→ Resetando schema public (modo desenvolvimento)')
  await client.query(`
    drop schema if exists public cascade;
    create schema public;
    grant usage on schema public to postgres, anon, authenticated, service_role;
    grant all on schema public to postgres, service_role;
    alter default privileges in schema public grant all on tables to postgres, service_role;
    alter default privileges in schema public grant all on sequences to postgres, service_role;
    alter default privileges in schema public grant all on functions to postgres, service_role;
  `)
}

await client.query(`
  create table if not exists public._migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`)

const dir = path.join(root, 'supabase', 'migrations')
const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
const { rows } = await client.query('select name from public._migrations')
const done = new Set(rows.map((r) => r.name))

let applied = 0
for (const file of files) {
  if (done.has(file)) continue
  const sql = await fs.readFile(path.join(dir, file), 'utf8')
  console.log(`→ Aplicando ${file}`)
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('insert into public._migrations(name) values ($1)', [file])
    await client.query('commit')
    applied++
  } catch (err) {
    await client.query('rollback')
    console.error(`✗ Falhou em ${file}: ${err.message}`)
    await client.end()
    process.exit(1)
  }
}
console.log(applied ? `✓ ${applied} migration(s) aplicada(s)` : '✓ Banco já está atualizado')
await client.end()
