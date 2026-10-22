import { describe, expect, it } from 'vitest'
import { buildCompactMessage, buildMessage, buildOrderWhatsapp, whatsappUrl, MAX_WHATSAPP_URL_LENGTH } from '@/lib/whatsapp'

const TEMPLATE =
  'Pedido *#{numero_pedido}*\n\n{itens}\n\n{cupom}*Total: {total}*\n\n*Cliente:* {nome}\n*Telefone:* {telefone}\n*Recebimento:* {recebimento}\n{endereco}{pagamento}{observacoes}Obrigado!'

const order = {
  number: 1001,
  customer_name: 'Maria Silva',
  customer_phone: '51999990000',
  fulfillment: 'pickup' as const,
  address: {},
  payment_preference: 'Pix',
  notes: null,
  subtotal: 354.7,
  discount: 35.47,
  total: 319.23,
  coupon_code: 'BEMVINDO10',
}

const items = [
  { product_name: 'Kit Chimarrão', variant_label: 'Natural', personalization_text: 'João', personalization_fee: 25, quantity: 1, line_total: 194.9 },
  { product_name: 'Cuia', variant_label: 'P', personalization_text: null, personalization_fee: 0, quantity: 2, line_total: 159.8 },
]

describe('mensagem do WhatsApp', () => {
  it('renderiza itens, personalização, cupom, total e dados do cliente', () => {
    const text = buildMessage({ template: TEMPLATE, order, items })
    expect(text).toContain('*#1001*')
    expect(text).toContain('• 1x Kit Chimarrão (Natural)')
    expect(text).toContain('✎ Personalização: "João" (+R$')
    expect(text).toContain('• 2x Cuia (P)')
    expect(text).toContain('*Cupom BEMVINDO10:* -R$')
    expect(text).toContain('*Total: R$')
    expect(text).toContain('(51) 99999-0000')
    expect(text).toContain('Retirada na loja')
    expect(text).toContain('*Pagamento:* Pix')
    expect(text).not.toContain('*Endereço:*')
  })

  it('inclui o endereço só na entrega e omite o cupom sem desconto', () => {
    const text = buildMessage({
      template: TEMPLATE,
      order: { ...order, fulfillment: 'delivery', discount: 0, coupon_code: null, address: { street: 'Rua A', number: '10', district: 'Centro', city: 'Porto Alegre', state: 'RS', cep: '90000-000' } },
      items,
    })
    expect(text).toContain('*Endereço:* Rua A, 10 - Centro - Porto Alegre/RS - CEP 90000-000')
    expect(text).not.toContain('Cupom')
  })

  it('mantém variáveis desconhecidas como estão', () => {
    expect(buildMessage({ template: 'Oi {nada} {nome}', order, items })).toBe('Oi {nada} Maria Silva')
  })

  it('wa.me usa o DDI 55 e codifica o texto', () => {
    expect(whatsappUrl('(51) 99999-0000', 'olá & você')).toBe('https://wa.me/5551999990000?text=ol%C3%A1%20%26%20voc%C3%AA')
    expect(whatsappUrl('5551999990000', 'x')).toContain('wa.me/5551999990000')
  })

  it('cai para a mensagem compacta com o link do pedido quando a URL fica grande demais', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ ...items[0], product_name: `Produto número ${i} com nome bem comprido para estourar` }))
    const result = buildOrderWhatsapp({ number: '51999990000', template: TEMPLATE, order, items: many, orderUrl: 'https://loja.example/pedido/abc' })
    expect(result.compact).toBe(true)
    expect(result.url.length).toBeLessThanOrEqual(MAX_WHATSAPP_URL_LENGTH)
    expect(result.text).toContain('https://loja.example/pedido/abc')
  })

  it('mensagem compacta resume o pedido', () => {
    const text = buildCompactMessage({ order, itemCount: 1, orderUrl: 'https://x/y' })
    expect(text).toContain('1 item')
    expect(text).toContain('#1001')
  })
})
