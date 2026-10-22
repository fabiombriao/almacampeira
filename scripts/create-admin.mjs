// Cria usuários admin no Supabase Auth do projeto Alma Campeira (credenciais do .env, sem conector MCP).
// Uso:  node scripts/create-admin.mjs                 cria os e-mails das variáveis EMAIL1, EMAIL2...
//       node scripts/create-admin.mjs a@x.com b@y.com  cria os e-mails informados
// A senha provisória é gerada aqui, gravada em .admin-credentials.local (fora do git) e NUNCA impressa.
// No primeiro login o admin é obrigado a trocar a senha (user_metadata.must_change_password).
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env'), quiet: true })

const url = process.env.SUPABASE_PROJECT_URL
const secret = process.env.SUPABASE_API_KEY
if (!url || !secret) {
  console.error('Faltam SUPABASE_PROJECT_URL e/ou SUPABASE_API_KEY no .env')
  process.exit(1)
}

const fromArgs = process.argv.slice(2).filter((a) => a.includes('@'))
const fromEnv = Object.keys(process.env)
  .filter((k) => /^EMAIL\d+$/.test(k))
  .sort()
  .map((k) => process.env[k])
const emails = [...new Set((fromArgs.length ? fromArgs : fromEnv).map((e) => e?.trim().toLowerCase()).filter(Boolean))]
if (!emails.length) {
  console.error('Nenhum e-mail informado (EMAIL1 no .env ou argumentos).')
  process.exit(1)
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  return Array.from(crypto.randomBytes(18), (b) => alphabet[b % alphabet.length]).join('') + '#7'
}

const credFile = path.join(root, '.admin-credentials.local')

for (const email of emails) {
  const password = generatePassword()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  })
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      // usuário já existe: só garante o cadastro em public.admins (senha e metadados ficam como estão)
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const found = list?.users.find((u) => u.email?.toLowerCase() === email)
      if (found) {
        await supabase.from('admins').upsert({ user_id: found.id })
        console.log(`• ${email}: já existia; garantido como admin (senha não alterada)`)
      }
      continue
    }
    console.error(`✗ ${email}: ${error.message}`)
    process.exitCode = 1
    continue
  }
  const { error: insertError } = await supabase.from('admins').insert({ user_id: data.user.id })
  if (insertError) {
    console.error(`✗ ${email}: usuário criado, mas falhou ao cadastrar como admin: ${insertError.message}`)
    process.exitCode = 1
    continue
  }
  await fs.appendFile(credFile, `${new Date().toISOString()}  ${email}  ${password}\n`, { mode: 0o600 })
  console.log(`✓ ${email}: admin criado. Senha provisória gravada em .admin-credentials.local (troca obrigatória no 1º login)`)
}
