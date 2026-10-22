import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ProductCard } from '@/components/product-card'
import { ProductGallery } from '@/components/product-gallery'
import { PurchasePanel } from '@/components/purchase-panel'
import { getProductBySlug, getProducts } from '@/lib/data/catalog'
import { productPriceInfo } from '@/lib/pricing'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Produto não encontrado' }
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: { images: product.images[0] ? [{ url: product.images[0].url }] : undefined },
  }
}

export default function ProdutoPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container-page py-8"><div className="aspect-square max-w-md animate-pulse rounded-lg bg-dark/10" /></div>}>
      <ProdutoContent params={params} />
    </Suspense>
  )
}

async function ProdutoContent({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const related = product.category ? (await getProducts({ categorySlug: product.category.slug, limit: 5 })).filter((p) => p.id !== product.id).slice(0, 4) : []
  const price = productPriceInfo(product)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: price.from,
      availability: product.variants.some((v) => v.stock_quantity > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="mb-4 text-sm text-ink/70" aria-label="Você está em">
        <Link href="/" className="hover:underline">Início</Link>
        {product.category && (
          <>
            {' / '}
            <Link href={`/categoria/${product.category.slug}`} className="hover:underline">{product.category.name}</Link>
          </>
        )}
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images.map((i) => i.url)} name={product.name} />
        <div>
          <h1 className="font-title text-4xl uppercase leading-tight">{product.name}</h1>
          <div className="mt-4">
            <PurchasePanel product={product} />
          </div>
          {product.description && (
            <div className="mt-8 border-t border-ink/10 pt-4">
              <h2 className="font-semibold">Descrição</h2>
              <p className="mt-2 whitespace-pre-line text-ink/80">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-title text-3xl uppercase">Você também pode gostar</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
