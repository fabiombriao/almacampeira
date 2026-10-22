'use server'

import { redirect } from 'next/navigation'
import { fail, str, type ActionState } from '@/lib/admin/common'
import { serverClient } from '@/lib/supabase/server'

export async function signInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, 'email').toLowerCase()
  const password = String(form.get('password') ?? '')
  if (!email || !password) return fail('Informe e-mail e senha.')

  const supabase = await serverClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return fail('E-mail ou senha incorretos.')
  redirect('/admin')
}

export async function signOutAction() {
  const supabase = await serverClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
