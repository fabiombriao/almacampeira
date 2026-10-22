import 'server-only'
import { getStoreSettings } from '@/lib/data/catalog'
import { originFromHeaders } from '@/lib/site'
import { serviceClient } from '@/lib/supabase/admin'
import type { Order, OrderItem } from '@/lib/types'
import { buildOrderWhatsapp } from '@/lib/whatsapp'

export type PublicOrder = {
  order: Order
  items: OrderItem[]
  whatsappUrl: string
  message: string
  pickupAddress: string
  businessHours: string
}

/** Pedido público: acessado só por quem tem o id (uuid) devolvido na criação. */
export async function getPublicOrder(orderId: string): Promise<PublicOrder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null
  const db = serviceClient()
  const [{ data: order }, { data: items }, settings] = await Promise.all([
    db.from('orders').select('*').eq('id', orderId).maybeSingle(),
    db.from('order_items').select('*').eq('order_id', orderId).order('product_name'),
    getStoreSettings(),
  ])
  if (!order) return null
  const origin = await originFromHeaders()
  const { text, url } = buildOrderWhatsapp({
    number: settings.whatsapp_number,
    template: settings.message_template,
    order: order as Order,
    items: (items ?? []) as OrderItem[],
    orderUrl: `${origin}/pedido/${orderId}`,
  })
  return {
    order: order as Order,
    items: (items ?? []) as OrderItem[],
    whatsappUrl: url,
    message: text,
    pickupAddress: settings.pickup_address,
    businessHours: settings.business_hours,
  }
}
