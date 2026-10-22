import 'server-only'
import { redirect } from 'next/navigation'
import { serverClient } from '@/lib/supabase/server'

/** Data Access Layer do admin: toda página/ação do painel passa por aqui. */
export async function requireAdmin(options: { allowPasswordChange?: boolean } = {}) {
  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!admin) redirect('/admin/login?erro=sem-acesso')

  if (user.user_metadata?.must_change_password && !options.allowPasswordChange) redirect('/admin/senha')
  return { supabase, user }
}
