'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { after } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { fail, ok, str, type ActionState } from '@/lib/admin/common'
import { originFromHeaders } from '@/lib/site'
import { dispatchOrderEvent } from '@/lib/tracking/server'

function orderError(message: string): string {
  const [code, ...rest] = message.split(':')
  const arg = rest.join(':').trim()
  switch (code.trim()) {
    case 'estoque_insuficiente':
      return `Estoque insuficiente de "${arg}" para confirmar este pedido. Ajuste o estoque do produto e tente de novo.`
    case 'transicao_invalida':
      return 'Essa mudança de status não é permitida.'
    case 'nao_autorizado':
      return 'Sem permissão para esta ação.'
    case 'pedido_nao_encontrado':
      return 'Pedido não encontrado.'
    default:
      return message
  }
}

export async function changeStatusAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const id = str(form, 'id')
  const status = str(form, 'status')
  const { error } = await supabase.rpc('change_order_status', { p_order_id: id, p_new: status })
  if (error) return fail(orderError(error.message))

  // estoque mudou: a vitrine (em cache) precisa refletir
  updateTag('products')
  revalidatePath(`/admin/pedidos/${id}`)
  revalidatePath('/admin/pedidos')

  if (status === 'entregue') {
    const origin = await originFromHeaders()
    after(() => dispatchOrderEvent(id, 'Purchase', origin))
  }
  return ok(status === 'confirmado' ? 'Pedido confirmado e estoque baixado.' : status === 'entregue' ? 'Pedido marcado como entregue.' : 'Pedido cancelado.')
}
