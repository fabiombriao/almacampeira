'use server'

import { cookies, headers } from 'next/headers'
import { after } from 'next/server'
import { originFromHeaders } from '@/lib/site'
import { serviceClient } from '@/lib/supabase/admin'
import { dispatchOrderEvent } from '@/lib/tracking/server'
import { friendlyDbError, checkoutSchema, cartItemSchema } from '@/lib/validation'
import { z } from 'zod'

export type QuoteLine = {
  variant_id: string
  product_id: string
  product_name: string
  variant_label: string | null
  unit_price: number
  personalization_text: string | null
  personalization_fee: number
  quantity: number
  line_total: number
}

export type QuoteResult =
  | { ok: true; lines: QuoteLine[]; subtotal: number; discount: number; total: number; couponCode: string | null; couponError?: string }
  | { ok: false; error: string }

const quoteSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  coupon_code: z.string().max(40).optional(),
})

function toRpcItems(items: z.infer<typeof cartItemSchema>[]) {
  return items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity, personalization_text: i.personalizationText ?? null }))
}

/** Cotação: o banco recalcula preço, taxa de personalização e cupom (nada vem do navegador). */
export async function quoteCartAction(input: unknown): Promise<QuoteResult> {
  const parsed = quoteSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Carrinho inválido.' }
  const db = serviceClient()
  const run = (coupon?: string) =>
    db.rpc('create_order', { p: { items: toRpcItems(parsed.data.items), coupon_code: coupon || null, dry_run: true } })

  let couponError: string | undefined
  let { data, error } = await run(parsed.data.coupon_code)
  if (error && error.message.startsWith('cupom_')) {
    couponError = friendlyDbError(error.message)
    ;({ data, error } = await run(undefined))
  }
  if (error || !data) return { ok: false, error: friendlyDbError(error?.message ?? '') }
  return {
    ok: true,
    lines: data.lines,
    subtotal: Number(data.subtotal),
    discount: Number(data.discount),
    total: Number(data.total),
    couponCode: data.coupon_code ?? null,
    couponError,
  }
}

export type PlaceOrderResult =
  | { ok: true; orderId: string; eventId: string; total: number; contents: { id: string; quantity: number; item_price: number }[] }
  | { ok: false; error: string }

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  const data = parsed.data
  if (data.website) return { ok: false, error: 'Não foi possível concluir o pedido.' }
  if (data.fulfillment === 'delivery') {
    const a = data.address ?? {}
    if (!a.street || !a.number || !a.district || !a.city) return { ok: false, error: 'Preencha o endereço completo para entrega.' }
  }

  const h = await headers()
  const jar = await cookies()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || undefined
  const tracking = {
    ip,
    user_agent: h.get('user-agent') ?? undefined,
    fbp: jar.get('_fbp')?.value,
    fbc: jar.get('_fbc')?.value,
    gclid: data.tracking?.gclid,
    fbclid: data.tracking?.fbclid,
    ga_client_id: data.tracking?.ga_client_id,
    source_url: data.tracking?.source_url,
  }

  const db = serviceClient()
  const { data: created, error } = await db.rpc('create_order', {
    p: {
      customer: { name: data.customer.name, phone: data.customer.phone, email: data.customer.email || null },
      fulfillment: data.fulfillment,
      address: data.fulfillment === 'delivery' ? data.address : {},
      payment_preference: data.payment_preference || null,
      notes: data.notes || null,
      coupon_code: data.coupon_code || null,
      items: toRpcItems(data.items),
      tracking,
      // pedidos de teste (e2e) não disparam conversão
      is_test: data.customer.name.startsWith('[TESTE]'),
    },
  })
  if (error || !created) return { ok: false, error: friendlyDbError(error?.message ?? '') }

  const orderId = created.id as string
  const { data: items } = await db.from('order_items').select('variant_id, product_id, quantity, unit_price, personalization_fee').eq('order_id', orderId)
  const siteUrl = await originFromHeaders()

  after(() => dispatchOrderEvent(orderId, 'InitiateCheckout', siteUrl))

  return {
    ok: true,
    orderId,
    eventId: created.event_id as string,
    total: Number(created.total),
    contents: (items ?? []).map((i) => ({
      id: (i.product_id ?? i.variant_id) as string,
      quantity: i.quantity as number,
      item_price: Number(i.unit_price) + Number(i.personalization_fee),
    })),
  }
}
