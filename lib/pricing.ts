import type { Product, ProductFull, Variant } from './types'

type PriceProduct = Pick<Product, 'base_price' | 'promo_price'>

/** Mesma regra do banco (create_order): preço da variante vale; senão promoção; senão preço base. */
export function variantPrice(product: PriceProduct, variant: Pick<Variant, 'price'>): number {
  return Number(variant.price ?? product.promo_price ?? product.base_price)
}

/** Preço "de" riscado, só quando há promoção ativa e a variante não tem preço próprio. */
export function variantOriginalPrice(product: PriceProduct, variant: Pick<Variant, 'price'>): number | null {
  if (variant.price != null) return null
  if (product.promo_price != null && Number(product.promo_price) < Number(product.base_price)) return Number(product.base_price)
  return null
}

export function productPriceInfo(product: ProductFull): { from: number; hasRange: boolean; original: number | null } {
  const variants = product.variants.length ? product.variants : [{ price: null } as Pick<Variant, 'price'>]
  const prices = variants.map((v) => variantPrice(product, v))
  const from = Math.min(...prices)
  const hasRange = Math.max(...prices) !== from
  const cheapest = variants.find((v) => variantPrice(product, v) === from)!
  return { from, hasRange, original: variantOriginalPrice(product, cheapest) }
}

export function productInStock(product: ProductFull): boolean {
  return product.variants.some((v) => v.stock_quantity > 0)
}

export function variantLabel(variant: Pick<Variant, 'option_values'>): string | null {
  const entries = Object.entries(variant.option_values ?? {}).sort(([a], [b]) => a.localeCompare(b))
  return entries.length ? entries.map(([, value]) => value).join(' / ') : null
}

export function cartLineKey(variantId: string, personalizationText: string | null): string {
  return `${variantId}|${(personalizationText ?? '').trim().toLowerCase()}`
}
