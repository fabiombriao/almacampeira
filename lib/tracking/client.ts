'use client'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

type Item = { id: string; name: string; price: number; quantity?: number }

const CURRENCY = 'BRL'

export function trackViewContent(item: Item) {
  window.fbq?.('track', 'ViewContent', {
    content_ids: [item.id],
    content_name: item.name,
    content_type: 'product',
    value: item.price,
    currency: CURRENCY,
  })
  window.gtag?.('event', 'view_item', {
    currency: CURRENCY,
    value: item.price,
    items: [{ item_id: item.id, item_name: item.name, price: item.price }],
  })
}

export function trackAddToCart(item: Item) {
  const quantity = item.quantity ?? 1
  window.fbq?.('track', 'AddToCart', {
    content_ids: [item.id],
    content_name: item.name,
    content_type: 'product',
    value: item.price * quantity,
    currency: CURRENCY,
  })
  window.gtag?.('event', 'add_to_cart', {
    currency: CURRENCY,
    value: item.price * quantity,
    items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity }],
  })
}

/** O begin_checkout do GA4 vai só pelo servidor (Measurement Protocol); aqui só o Pixel, com o mesmo eventID da CAPI. */
export function trackInitiateCheckout(args: { eventId: string; value: number; contents: { id: string; quantity: number; item_price: number }[] }) {
  window.fbq?.(
    'track',
    'InitiateCheckout',
    {
      content_type: 'product',
      contents: args.contents,
      num_items: args.contents.reduce((n, c) => n + c.quantity, 0),
      value: args.value,
      currency: CURRENCY,
    },
    { eventID: args.eventId },
  )
}

const CLICK_KEY = 'ac_click_ids'

/** Guarda gclid/fbclid do primeiro acesso para enviar junto do pedido (atribuição das conversões). */
export function captureClickIds() {
  try {
    const params = new URLSearchParams(window.location.search)
    const gclid = params.get('gclid')
    const fbclid = params.get('fbclid')
    if (!gclid && !fbclid) return
    const current = JSON.parse(localStorage.getItem(CLICK_KEY) ?? '{}')
    localStorage.setItem(CLICK_KEY, JSON.stringify({ ...current, ...(gclid ? { gclid } : {}), ...(fbclid ? { fbclid } : {}) }))
  } catch {
    // sem storage: segue sem atribuição por click id
  }
}

export function readTrackingContext(): { gclid?: string; fbclid?: string; ga_client_id?: string; source_url: string } {
  let ids: { gclid?: string; fbclid?: string } = {}
  try {
    ids = JSON.parse(localStorage.getItem(CLICK_KEY) ?? '{}')
  } catch {
    ids = {}
  }
  // cookie _ga = GA1.1.<client_id parte 1>.<parte 2>
  const ga = document.cookie.split('; ').find((c) => c.startsWith('_ga='))?.split('=')[1]
  const ga_client_id = ga ? ga.split('.').slice(-2).join('.') : undefined
  return { ...ids, ga_client_id, source_url: window.location.origin + '/checkout' }
}
