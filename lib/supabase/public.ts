import { createClient } from '@supabase/supabase-js'

/** Cliente sem cookies (chave publishable + RLS). Usado nas leituras em cache da vitrine. */
export function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
