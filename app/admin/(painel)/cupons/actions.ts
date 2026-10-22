'use server'

import { requireAdmin } from '@/lib/admin/auth'
import { bool, dbMessage, fail, int, money, ok, str, type ActionState } from '@/lib/admin/common'

export async function saveCouponAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const id = str(form, 'id')
  const code = str(form, 'code').toUpperCase().replace(/\s+/g, '')
  const type = str(form, 'type')
  const value = money(str(form, 'value'))
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return fail('O código deve ter de 3 a 30 letras, números, - ou _.')
  if (type !== 'percent' && type !== 'fixed') return fail('Escolha o tipo de desconto.')
  if (value == null || value <= 0) return fail('Informe o valor do desconto.')
  if (type === 'percent' && value > 100) return fail('O desconto em % não pode passar de 100.')

  const startsAt = str(form, 'starts_at')
  const endsAt = str(form, 'ends_at')
  const maxUses = str(form, 'max_uses')
  const row = {
    code,
    type,
    value,
    min_order: money(str(form, 'min_order')) ?? 0,
    starts_at: startsAt ? new Date(`${startsAt}T00:00:00-03:00`).toISOString() : null,
    ends_at: endsAt ? new Date(`${endsAt}T23:59:59-03:00`).toISOString() : null,
    max_uses: maxUses ? int(maxUses) : null,
    active: bool(form, 'active'),
  }
  const { error } = id ? await supabase.from('coupons').update(row).eq('id', id) : await supabase.from('coupons').insert(row)
  if (error) return fail(dbMessage(error))
  return ok(id ? 'Cupom salvo.' : 'Cupom criado.')
}

export async function deleteCouponAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('coupons').delete().eq('id', str(form, 'id'))
  if (error) return fail(dbMessage(error))
  return ok('Cupom excluído.')
}
