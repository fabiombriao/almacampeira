import { brl, formatPhone, toInternationalPhone } from './format'
import type { Address, Order, OrderItem } from './types'

export type MessageOrder = Pick<
  Order,
  'number' | 'customer_name' | 'customer_phone' | 'fulfillment' | 'address' | 'payment_preference' | 'notes' | 'subtotal' | 'discount' | 'total' | 'coupon_code'
>

/** Limite seguro para a URL do wa.me. Acima disso usamos a mensagem compacta com link do pedido. */
export const MAX_WHATSAPP_URL_LENGTH = 1900

export function formatItems(items: Pick<OrderItem, 'product_name' | 'variant_label' | 'personalization_text' | 'personalization_fee' | 'quantity' | 'line_total'>[]): string {
  return items
    .map((item) => {
      const name = [item.product_name, item.variant_label ? `(${item.variant_label})` : ''].filter(Boolean).join(' ')
      let line = `• ${item.quantity}x ${name} — ${brl(item.line_total)}`
      if (item.personalization_text) {
        const fee = Number(item.personalization_fee)
        line += `\n   ✎ Personalização: "${item.personalization_text}"${fee > 0 ? ` (+${brl(fee)} cada)` : ''}`
      }
      return line
    })
    .join('\n')
}

export function formatAddress(address: Address): string {
  const street = [address.street, address.number].filter(Boolean).join(', ')
  const parts = [street, address.complement, address.district, [address.city, address.state].filter(Boolean).join('/'), address.cep ? `CEP ${address.cep}` : '']
  return parts.filter(Boolean).join(' - ')
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match))
}

export function buildMessage(args: { template: string; order: MessageOrder; items: Parameters<typeof formatItems>[0] }): string {
  const { template, order, items } = args
  const hasDiscount = Number(order.discount) > 0
  const vars: Record<string, string> = {
    numero_pedido: String(order.number),
    itens: formatItems(items),
    subtotal: brl(order.subtotal),
    total: brl(order.total),
    cupom: hasDiscount ? `*Subtotal:* ${brl(order.subtotal)}\n*Cupom ${order.coupon_code}:* -${brl(order.discount)}\n` : '',
    nome: order.customer_name,
    telefone: formatPhone(order.customer_phone),
    recebimento: order.fulfillment === 'delivery' ? 'Entrega' : 'Retirada na loja',
    endereco: order.fulfillment === 'delivery' ? `*Endereço:* ${formatAddress(order.address)}\n` : '',
    pagamento: order.payment_preference ? `*Pagamento:* ${order.payment_preference}\n` : '',
    observacoes: order.notes ? `*Observações:* ${order.notes}\n` : '',
  }
  return renderTemplate(template, vars).trim()
}

export function buildCompactMessage(args: { order: MessageOrder; itemCount: number; orderUrl: string }): string {
  const { order, itemCount, orderUrl } = args
  return [
    `Olá! Fiz o pedido *#${order.number}* com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}, total de *${brl(order.total)}*.`,
    `Cliente: ${order.customer_name} (${formatPhone(order.customer_phone)})`,
    `Recebimento: ${order.fulfillment === 'delivery' ? 'Entrega' : 'Retirada na loja'}`,
    `Detalhes do pedido: ${orderUrl}`,
  ].join('\n')
}

export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${toInternationalPhone(number)}?text=${encodeURIComponent(text)}`
}

/** Monta a mensagem e a URL; se a URL ficar grande demais, cai para a versão compacta com o link do pedido. */
export function buildOrderWhatsapp(args: {
  number: string
  template: string
  order: MessageOrder
  items: Parameters<typeof formatItems>[0]
  orderUrl: string
}): { text: string; url: string; compact: boolean } {
  const full = buildMessage({ template: args.template, order: args.order, items: args.items })
  const fullUrl = whatsappUrl(args.number, full)
  if (fullUrl.length <= MAX_WHATSAPP_URL_LENGTH) return { text: full, url: fullUrl, compact: false }
  const text = buildCompactMessage({ order: args.order, itemCount: args.items.length, orderUrl: args.orderUrl })
  return { text, url: whatsappUrl(args.number, text), compact: true }
}
