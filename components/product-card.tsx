import Link from 'next/link'
import { ProductImage } from '@/components/product-image'
import { brl } from '@/lib/format'
import { productInStock, productPriceInfo } from '@/lib/pricing'
import type { ProductFull } from '@/lib/types'

export function ProductCard({ product, priority = false }: { product: ProductFull; priority?: boolean }) {
  const price = productPriceInfo(product)
  const inStock = productInStock(product)
  const image = product.images[0]?.url
  return (
    <Link href={`/produto/${product.slug}`} className="group card block overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/5] bg-dark/10">
        {image && <ProductImage src={image} alt={product.name} priority={priority} className="object-cover transition-transform duration-300 group-hover:scale-105" />}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {price.original && <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold text-white">Promoção</span>}
          {product.allows_personalization && <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-white">Personalizável</span>}
        </div>
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark/60">
            <span className="rounded bg-light px-3 py-1 text-sm font-semibold">Esgotado</span>
          </div>
        )}
      </div>
      <div className="p-3">
        {product.category && <p className="text-xs uppercase tracking-wider text-ink/60">{product.category.name}</p>}
        <h3 className="mt-0.5 line-clamp-2 font-semibold">{product.name}</h3>
        <p className="mt-1 text-sm">
          {price.hasRange && <span className="text-ink/60">a partir de </span>}
          {price.original && <span className="mr-1 text-ink/50 line-through">{brl(price.original)}</span>}
          <span className="font-bold text-primary">{brl(price.from)}</span>
        </p>
      </div>
    </Link>
  )
}
