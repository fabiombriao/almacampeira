'use client'

import { useState } from 'react'
import { ProductImage } from '@/components/product-image'

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0)
  if (!images.length) return <div className="aspect-square rounded-lg bg-dark/10" />
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-dark/10">
        <ProductImage src={images[index]} alt={name} priority sizes="(min-width: 1024px) 40vw, 100vw" />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <li key={src + i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver imagem ${i + 1} de ${images.length}`}
                aria-current={i === index}
                className={`relative block h-16 w-16 overflow-hidden rounded border-2 ${i === index ? 'border-primary' : 'border-transparent'}`}
              >
                <ProductImage src={src} alt="" sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
