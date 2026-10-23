import { describe, expect, it } from 'vitest'
import { buildGallery, firstIndexOfVariant, productCover, variantCover, variantForImage } from '@/lib/gallery'
import type { Variant } from '@/lib/types'

const variant = (id: string, image_urls: string[]): Variant => ({
  id,
  product_id: 'p',
  sku: id,
  option_values: {},
  price: null,
  stock_quantity: 1,
  active: true,
  sort_order: 0,
  image_urls,
})

const product = {
  images: [
    { url: 'geral.webp', sort_order: 0 },
    { url: 'a1.webp', sort_order: 1 },
    { url: 'a2.webp', sort_order: 2 },
    { url: 'b1.webp', sort_order: 3 },
  ],
  variants: [variant('A', ['a1.webp', 'a2.webp']), variant('B', ['b1.webp']), variant('C', [])],
}

describe('galeria ligada às variações', () => {
  const gallery = buildGallery(product)

  it('liga cada foto às variações que a escolheram (uma ou várias fotos por SKU)', () => {
    expect(gallery.map((g) => g.variantIds)).toEqual([[], ['A'], ['A'], ['B']])
  })

  it('escolher o SKU leva à primeira foto dele; SKU sem foto devolve -1', () => {
    expect(firstIndexOfVariant(gallery, 'A')).toBe(1)
    expect(firstIndexOfVariant(gallery, 'B')).toBe(3)
    expect(firstIndexOfVariant(gallery, 'C')).toBe(-1)
  })

  it('clicar numa foto seleciona o SKU dela; foto geral ou da variação atual não troca', () => {
    expect(variantForImage(gallery[3], 'A')).toBe('B')
    expect(variantForImage(gallery[0], 'A')).toBe('A')
    expect(variantForImage(gallery[2], 'A')).toBe('A')
  })

  it('foto compartilhada por dois SKUs mantém o atual', () => {
    const shared = buildGallery({ images: product.images, variants: [variant('A', ['a1.webp']), variant('B', ['a1.webp'])] })
    expect(shared[1].variantIds).toEqual(['A', 'B'])
    expect(variantForImage(shared[1], 'B')).toBe('B')
    expect(variantForImage(shared[1], 'Z')).toBe('A')
  })

  it('capas: do SKU e do produto', () => {
    expect(variantCover(product, 'A')).toBe('a1.webp')
    expect(variantCover(product, 'C')).toBeNull()
    expect(productCover(product)).toBe('geral.webp')
    expect(productCover({ images: [], variants: [] })).toBeNull()
  })
})
