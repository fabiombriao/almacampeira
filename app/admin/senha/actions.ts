'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { fail, type ActionState } from '@/lib/admin/common'

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin({ allowPasswordChange: true })
  const password = String(form.get('password') ?? '')
  const confirm = String(form.get('confirm') ?? '')
  if (password.length < 10) return fail('Use pelo menos 10 caracteres.')
  if (password !== confirm) return fail('As senhas não conferem.')

  const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } })
  if (error) return fail(error.message.includes('different') ? 'A nova senha precisa ser diferente da atual.' : error.message)
  redirect('/admin')
}
