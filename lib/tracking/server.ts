import 'server-only'
import crypto from 'node:crypto'
import { serviceClient } from '@/lib/supabase/admin'
import { toInternationalPhone } from '@/lib/format'
import type { Order, OrderItem } from '@/lib/types'

export type EventKind = 'InitiateCheckout' | 'Purchase'
type Outcome = { platform: string; status: 'sent' | 'failed' | 'skipped' | 'dry_run'; detail: string }

type Secrets = {
  meta_capi_token: string | null
  meta_test_event_code: string | null
  ga4_api_secret: string | null
  ads_customer_id: string | null
  ads_login_customer_id: string | null
  ads_conversion_action: string | null
  ads_developer_token: string | null
  ads_client_id: string | null
  ads_client_secret: string | null
  ads_refresh_token: string | null
  send_pii: boolean
  dry_run: boolean
}

const META_API_VERSION = 'v21.0'
const ADS_API_VERSION = 'v21'

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex')
const clean = (value: string | null | undefined) => (value ?? '').trim().toLowerCase()

export function hashedUserData(order: Pick<Order, 'customer_name' | 'customer_phone' | 'customer_email' | 'address'>) {
  const [first, ...rest] = clean(order.customer_name).split(/\s+/)
  const last = rest.at(-1)
  return {
    em: order.customer_email ? [sha256(clean(order.customer_email))] : undefined,
    ph: order.customer_phone ? [sha256(toInternationalPhone(order.customer_phone))] : undefined,
    fn: first ? [sha256(first)] : undefined,
    ln: last ? [sha256(last)] : undefined,
    ct: order.address?.city ? [sha256(clean(order.address.city).normalize('NFD').replace(/[̀-ͯ\s]/g, ''))] : undefined,
    st: order.address?.state ? [sha256(clean(order.address.state))] : undefined,
    zp: order.address?.cep ? [sha256(order.address.cep.replace(/\D/g, ''))] : undefined,
    country: [sha256('br')],
  }
}

function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)) as T
}

function fbcFrom(order: Order): string | undefined {
  if (order.tracking.fbc) return order.tracking.fbc
  if (order.tracking.fbclid) return `fb.1.${new Date(order.created_at).getTime()}.${order.tracking.fbclid}`
  return undefined
}

async function sendMeta(kind: EventKind, order: Order, items: OrderItem[], pixelId: string | null, s: Secrets, siteUrl: string): Promise<Outcome> {
  if (!pixelId || !s.meta_capi_token) return { platform: 'meta', status: 'skipped', detail: 'Pixel ID ou token da CAPI não cadastrados' }
  const eventTime = kind === 'Purchase' ? Math.floor(Date.now() / 1000) : Math.floor(new Date(order.created_at).getTime() / 1000)
  const userData = s.send_pii ? hashedUserData(order) : {}
  const event = {
    event_name: kind,
    event_time: eventTime,
    // mesmo event_id do Pixel no navegador (InitiateCheckout) para deduplicar; Purchase tem id próprio
    event_id: kind === 'InitiateCheckout' ? order.event_id : `${order.event_id}-purchase`,
    action_source: 'website',
    event_source_url: order.tracking.source_url ?? `${siteUrl}/checkout`,
    user_data: compact({
      ...userData,
      client_ip_address: order.tracking.ip,
      client_user_agent: order.tracking.user_agent,
      fbp: order.tracking.fbp,
      fbc: fbcFrom(order),
    }),
    custom_data: {
      currency: 'BRL',
      value: Number(order.total),
      order_id: String(order.number),
      content_type: 'product',
      content_ids: items.map((i) => i.product_id ?? i.variant_id).filter(Boolean),
      contents: items.map((i) => ({ id: i.product_id ?? i.variant_id, quantity: i.quantity, item_price: Number(i.unit_price) + Number(i.personalization_fee) })),
      num_items: items.reduce((n, i) => n + i.quantity, 0),
    },
  }
  const body = { data: [event], ...(s.meta_test_event_code ? { test_event_code: s.meta_test_event_code } : {}) }
  if (s.dry_run) return { platform: 'meta', status: 'dry_run', detail: `Modo de teste: ${kind} não enviado (valor ${event.custom_data.value})` }

  const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(s.meta_capi_token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  const text = (await res.text()).slice(0, 300)
  return { platform: 'meta', status: res.ok ? 'sent' : 'failed', detail: `HTTP ${res.status} ${text}` }
}

async function sendGa4(kind: EventKind, order: Order, items: OrderItem[], measurementId: string | null, s: Secrets): Promise<Outcome> {
  if (!measurementId || !s.ga4_api_secret) return { platform: 'ga4', status: 'skipped', detail: 'Measurement ID ou API secret do GA4 não cadastrados' }
  const fallbackId = `${parseInt(order.event_id.replace(/\D/g, '').slice(0, 9) || '1', 10)}.${Math.floor(new Date(order.created_at).getTime() / 1000)}`
  const user = s.send_pii
    ? compact({
        sha256_email_address: order.customer_email ? [sha256(clean(order.customer_email))] : undefined,
        sha256_phone_number: order.customer_phone ? [sha256(`+${toInternationalPhone(order.customer_phone)}`)] : undefined,
      })
    : undefined
  const body = {
    client_id: order.tracking.ga_client_id || fallbackId,
    ...(user && Object.keys(user).length ? { user_data: user } : {}),
    events: [
      {
        name: kind === 'Purchase' ? 'purchase' : 'begin_checkout',
        params: {
          currency: 'BRL',
          value: Number(order.total),
          transaction_id: String(order.number),
          engagement_time_msec: 1,
          items: items.map((i) => ({
            item_id: i.product_id ?? i.variant_id,
            item_name: i.product_name,
            item_variant: i.variant_label ?? undefined,
            price: Number(i.unit_price) + Number(i.personalization_fee),
            quantity: i.quantity,
          })),
        },
      },
    ],
  }
  if (s.dry_run) return { platform: 'ga4', status: 'dry_run', detail: `Modo de teste: ${body.events[0].name} não enviado` }
  const res = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(s.ga4_api_secret)}`,
    { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(10000) },
  )
  return { platform: 'ga4', status: res.ok ? 'sent' : 'failed', detail: `HTTP ${res.status}` }
}

/** Google Ads: conversão offline (upload de click conversion com gclid). Só para Purchase. */
async function sendGoogleAds(kind: EventKind, order: Order, s: Secrets): Promise<Outcome> {
  if (kind !== 'Purchase') return { platform: 'google_ads', status: 'skipped', detail: 'Só envia Purchase' }
  const { ads_customer_id, ads_conversion_action, ads_developer_token, ads_client_id, ads_client_secret, ads_refresh_token } = s
  if (!ads_customer_id || !ads_conversion_action || !ads_developer_token || !ads_client_id || !ads_client_secret || !ads_refresh_token) {
    return { platform: 'google_ads', status: 'skipped', detail: 'Credenciais do Google Ads não cadastradas' }
  }
  if (!order.tracking.gclid) return { platform: 'google_ads', status: 'skipped', detail: 'Pedido sem gclid (cliente não veio de anúncio do Google)' }
  if (s.dry_run) return { platform: 'google_ads', status: 'dry_run', detail: 'Modo de teste: conversão não enviada' }

  const customer = ads_customer_id.replace(/\D/g, '')
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: ads_client_id, client_secret: ads_client_secret, refresh_token: ads_refresh_token, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(10000),
  })
  if (!tokenRes.ok) return { platform: 'google_ads', status: 'failed', detail: `OAuth HTTP ${tokenRes.status}` }
  const { access_token } = (await tokenRes.json()) as { access_token: string }

  const when = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ') + '-03:00'
  const userIdentifiers = s.send_pii
    ? [
        order.customer_email ? { hashedEmail: sha256(clean(order.customer_email)) } : null,
        order.customer_phone ? { hashedPhoneNumber: sha256(`+${toInternationalPhone(order.customer_phone)}`) } : null,
      ].filter(Boolean)
    : []
  const res = await fetch(`https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customer}:uploadClickConversions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'developer-token': ads_developer_token,
      'Content-Type': 'application/json',
      ...(s.ads_login_customer_id ? { 'login-customer-id': s.ads_login_customer_id.replace(/\D/g, '') } : {}),
    },
    body: JSON.stringify({
      conversions: [
        {
          gclid: order.tracking.gclid,
          conversionAction: `customers/${customer}/conversionActions/${ads_conversion_action.replace(/\D/g, '')}`,
          conversionDateTime: when,
          conversionValue: Number(order.total),
          currencyCode: 'BRL',
          orderId: String(order.number),
          ...(userIdentifiers.length ? { userIdentifiers } : {}),
        },
      ],
      partialFailure: true,
    }),
    signal: AbortSignal.timeout(15000),
  })
  const text = (await res.text()).slice(0, 300)
  return { platform: 'google_ads', status: res.ok ? 'sent' : 'failed', detail: `HTTP ${res.status} ${text}` }
}

/**
 * Dispara o evento de conversão do pedido em Meta (CAPI), GA4 (Measurement Protocol) e Google Ads,
 * e registra cada resultado em tracking_events (visível no admin). Nunca lança erro para quem chamou.
 */
export async function dispatchOrderEvent(orderId: string, kind: EventKind, siteUrl = ''): Promise<void> {
  const db = serviceClient()
  try {
    const [orderRes, itemsRes, settingsRes, secretsRes] = await Promise.all([
      db.from('orders').select('*').eq('id', orderId).single(),
      db.from('order_items').select('*').eq('order_id', orderId),
      db.from('store_settings').select('meta_pixel_id, ga4_measurement_id').eq('id', 1).single(),
      db.from('integration_secrets').select('*').eq('id', 1).single(),
    ])
    if (!orderRes.data) return
    const order = orderRes.data as Order
    const items = (itemsRes.data ?? []) as OrderItem[]
    const secrets = secretsRes.data as Secrets
    const settings = settingsRes.data as { meta_pixel_id: string | null; ga4_measurement_id: string | null }

    let outcomes: Outcome[]
    if (order.is_test) {
      outcomes = ['meta', 'ga4', 'google_ads'].map((platform) => ({ platform, status: 'skipped' as const, detail: 'Pedido de teste' }))
    } else {
      const settled = await Promise.allSettled([
        sendMeta(kind, order, items, settings.meta_pixel_id, secrets, siteUrl),
        sendGa4(kind, order, items, settings.ga4_measurement_id, secrets),
        sendGoogleAds(kind, order, secrets),
      ])
      const platforms = ['meta', 'ga4', 'google_ads']
      outcomes = settled.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { platform: platforms[i], status: 'failed' as const, detail: String(r.reason).slice(0, 300) },
      )
    }
    await db.from('tracking_events').insert(
      outcomes.map((o) => ({ order_id: orderId, platform: o.platform, event_name: kind, status: o.status, detail: o.detail })),
    )
  } catch (error) {
    console.error('dispatchOrderEvent falhou', error)
  }
}
