import type { ProductFull } from './types'

type GalleryProduct = Pick<ProductFull, 'images' | 'variants'>

/** Uma foto da galeria e as variações (SKUs) a que ela está ligada. Vazio = foto geral do produto. */
export type GalleryItem = { url: string; variantIds: string[] }

/** A galeria é a lista de fotos do produto; cada variação aponta para as suas (`image_urls`). */
export function buildGallery(product: GalleryProduct): GalleryItem[] {
  return product.images.map((image) => ({
    url: image.url,
    variantIds: product.variants.filter((v) => (v.image_urls ?? []).includes(image.url)).map((v) => v.id),
  }))
}

/** Posição da primeira foto ligada à variação, ou -1 se ela não tem foto própria. */
export function firstIndexOfVariant(gallery: GalleryItem[], variantId: string): number {
  return gallery.findIndex((item) => item.variantIds.includes(variantId))
}

/** Foto de capa da variação (para o carrinho e as miniaturas): a primeira ligada a ela. */
export function variantCover(product: GalleryProduct, variantId: string): string | null {
  const index = firstIndexOfVariant(buildGallery(product), variantId)
  return index >= 0 ? product.images[index].url : null
}

/** Capa do produto na vitrine: primeira foto da galeria. */
export function productCover(product: GalleryProduct): string | null {
  return product.images[0]?.url ?? null
}

/** Variação que deve ficar selecionada ao clicar numa foto: mantém a atual se a foto também é dela. */
export function variantForImage(item: GalleryItem | undefined, currentVariantId: string): string {
  if (!item || !item.variantIds.length || item.variantIds.includes(currentVariantId)) return currentVariantId
  return item.variantIds[0]
}
