import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente com a chave secreta (ignora RLS). SÓ no servidor.
 * Usado para: criar pedido (create_order), ler segredos de integração, ler pedido pelo id público.
 */
export function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_API_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
