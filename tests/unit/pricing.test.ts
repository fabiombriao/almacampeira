import { describe, expect, it } from 'vitest'
import { formatPhone, maskPhone, slugify, toInternationalPhone } from '@/lib/format'
import { cartLineKey, productInStock, productPriceInfo, variantLabel, variantOriginalPrice, variantPrice } from '@/lib/pricing'
import { checkoutSchema, friendlyDbError } from '@/lib/validation'
import { money } from '@/lib/admin/common'
import type { ProductFull } from '@/lib/types'

const product = { base_price: 100, promo_price: 80 }

describe('preço (mesma regra do banco)', () => {
  it('preço da variante vale; senão promoção; senão base', () => {
    expect(variantPrice(product, { price: 120 })).toBe(120)
    expect(variantPrice(product, { price: null })).toBe(80)
    expect(variantPrice({ base_price: 100, promo_price: null }, { price: null })).toBe(100)
  })

  it('preço riscado só quando há promoção e a variante não tem preço próprio', () => {
    expect(variantOriginalPrice(product, { price: null })).toBe(100)
    expect(variantOriginalPrice(product, { price: 90 })).toBeNull()
    expect(variantOriginalPrice({ base_price: 100, promo_price: null }, { price: null })).toBeNull()
  })

  it('"a partir de" usa o menor preço entre as variantes', () => {
    const p = {
      ...product,
      variants: [
        { price: 150, stock_quantity: 0 },
        { price: null, stock_quantity: 3 },
      ],
    } as unknown as ProductFull
    const info = productPriceInfo(p)
    expect(info.from).toBe(80)
    expect(info.hasRange).toBe(true)
    expect(productInStock(p)).toBe(true)
  })

  it('rótulo da variante e chave do carrinho', () => {
    expect(variantLabel({ option_values: { Tamanho: 'M', Cor: 'Preto' } })).toBe('Preto / M')
    expect(variantLabel({ option_values: {} })).toBeNull()
    expect(cartLineKey('abc', ' João ')).toBe('abc|joão')
    expect(cartLineKey('abc', null)).toBe('abc|')
  })
})

describe('formatação e validação', () => {
  it('telefone', () => {
    expect(toInternationalPhone('(51) 99999-0000')).toBe('5551999990000')
    expect(formatPhone('5551999990000')).toBe('(51) 99999-0000')
    expect(maskPhone('51999990000')).toBe('(51) 99999-0000')
  })

  it('slug sem acento', () => {
    expect(slugify('Cuia de Porongo Premium!')).toBe('cuia-de-porongo-premium')
    expect(slugify('Moda Gaúcha')).toBe('moda-gaucha')
  })

  it('valores em reais do admin', () => {
    expect(money('1.234,56')).toBe(1234.56)
    expect(money('12,5')).toBe(12.5)
    expect(money('12.5')).toBe(12.5)
    expect(money('')).toBeNull()
  })

  it('traduz erros do banco para o cliente', () => {
    expect(friendlyDbError('estoque_insuficiente:Cuia')).toContain('Cuia')
    expect(friendlyDbError('cupom_invalido')).toContain('Cupom')
    expect(friendlyDbError('algo_inesperado:x')).toBe('Não foi possível concluir. Tente novamente.')
  })

  it('checkout: exige nome, telefone com DDD, itens e barra o honeypot preenchido', () => {
    const base = {
      customer: { name: 'Maria', phone: '(51) 99999-0000', email: '' },
      fulfillment: 'pickup',
      items: [{ variantId: '8b6f6a8e-6d58-4a52-9d3e-0f3b2f6a9c11', quantity: 1 }],
    }
    expect(checkoutSchema.safeParse(base).success).toBe(true)
    expect(checkoutSchema.safeParse({ ...base, customer: { ...base.customer, phone: '123' } }).success).toBe(false)
    expect(checkoutSchema.safeParse({ ...base, items: [] }).success).toBe(false)
    expect(checkoutSchema.safeParse({ ...base, website: 'spam' }).success).toBe(false)
  })
})
