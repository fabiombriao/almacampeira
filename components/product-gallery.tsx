'use client'

import { ProductImage } from '@/components/product-image'
import { useProductSelection } from '@/components/product-selection'

export function ProductGallery({ name }: { name: string }) {
  const { gallery, imageIndex, selectImage } = useProductSelection()
  if (!gallery.length) return <div className="aspect-square rounded-lg bg-dark/10" />
  const current = gallery[imageIndex] ?? gallery[0]
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-dark/10">
        <ProductImage src={current.url} alt={name} priority sizes="(min-width: 1024px) 40vw, 100vw" />
      </div>
      {gallery.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto">
          {gallery.map((item, i) => (
            <li key={item.url + i}>
              <button
                type="button"
                onClick={() => selectImage(i)}
                aria-label={`Ver imagem ${i + 1} de ${gallery.length}`}
                aria-current={i === imageIndex}
                className={`relative block h-16 w-16 overflow-hidden rounded border-2 ${i === imageIndex ? 'border-primary' : 'border-transparent'}`}
              >
                <ProductImage src={item.url} alt="" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
