import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ProductCard } from '@/components/product-card'
import { getCategories, getProducts } from '@/lib/data/catalog'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = (await getCategories()).find((c) => c.slug === slug)
  return { title: category?.name ?? 'Categoria' }
}

export default function CategoriaPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container-page py-8"><div className="h-10 w-64 animate-pulse rounded bg-dark/10" /></div>}>
      <CategoriaContent params={params} />
    </Suspense>
  )
}

async function CategoriaContent({ params }: Props) {
  const { slug } = await params
  const [categories, products] = await Promise.all([getCategories(), getProducts({ categorySlug: slug })])
  const category = categories.find((c) => c.slug === slug)
  if (!category) notFound()
  return (
    <div className="container-page py-8">
      <h1 className="font-title text-4xl uppercase">{category.name}</h1>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar por categoria">
        <Link href="/produtos" className="rounded-full border border-ink/30 bg-white px-4 py-1.5 text-sm hover:border-primary">
          Todos
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/categoria/${c.slug}`}
            className={`rounded-full border px-4 py-1.5 text-sm ${c.slug === slug ? 'border-primary bg-primary text-white' : 'border-ink/30 bg-white hover:border-primary'}`}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      {products.length ? (
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="card mt-6 p-8 text-center text-ink/70">Nenhum produto nesta categoria ainda.</p>
      )}
    </div>
  )
}
