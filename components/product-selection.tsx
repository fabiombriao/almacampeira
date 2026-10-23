'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { buildGallery, firstIndexOfVariant, variantForImage, type GalleryItem } from '@/lib/gallery'
import type { ProductFull } from '@/lib/types'

type Selection = {
  gallery: GalleryItem[]
  variantId: string
  imageIndex: number
  /** Escolheu a variação: a galeria vai para a primeira foto dela (se tiver). */
  selectVariant: (id: string) => void
  /** Clicou numa foto: se ela é de uma variação, essa variação fica selecionada. */
  selectImage: (index: number) => void
}

const Context = createContext<Selection | null>(null)

export function useProductSelection(): Selection {
  const value = useContext(Context)
  if (!value) throw new Error('useProductSelection precisa estar dentro de <ProductSelection>')
  return value
}

/** Guarda a variação e a foto em destaque, compartilhadas pela galeria e pelo painel de compra. */
export function ProductSelection({ product, children }: { product: ProductFull; children: React.ReactNode }) {
  const gallery = useMemo(() => buildGallery(product), [product])
  const [state, setState] = useState(() => {
    const firstAvailable = product.variants.find((v) => v.stock_quantity > 0) ?? product.variants[0]
    const variantId = firstAvailable?.id ?? ''
    // a foto de capa manda, mas se ela é de um SKU disponível, esse SKU já começa selecionado
    const cover = gallery[0]
    const coverVariant = cover?.variantIds.find((id) => product.variants.some((v) => v.id === id && v.stock_quantity > 0))
    return { variantId: coverVariant ?? variantId, imageIndex: 0 }
  })

  const value = useMemo<Selection>(
    () => ({
      gallery,
      variantId: state.variantId,
      imageIndex: state.imageIndex,
      selectVariant: (id) =>
        setState((prev) => {
          const index = firstIndexOfVariant(gallery, id)
          return { variantId: id, imageIndex: index >= 0 ? index : prev.imageIndex }
        }),
      selectImage: (index) => setState((prev) => ({ variantId: variantForImage(gallery[index], prev.variantId), imageIndex: index })),
    }),
    [gallery, state],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}
