import type { Metadata } from 'next'
import Link from 'next/link'
import { ProductCard } from '@/components/product-card'
import { getCategories, getProducts } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Todos os produtos' }

export default async function ProdutosPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()])
  return (
    <div className="container-page py-8">
      <h1 className="font-title text-4xl uppercase">Todos os produtos</h1>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar por categoria">
        <span className="rounded-full bg-primary px-4 py-1.5 text-sm text-white">Todos</span>
        {categories.map((c) => (
          <Link key={c.id} href={`/categoria/${c.slug}`} className="rounded-full border border-ink/30 bg-white px-4 py-1.5 text-sm hover:border-primary">
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
        <p className="card mt-6 p-8 text-center text-ink/70">Nenhum produto disponível no momento.</p>
      )}
    </div>
  )
}
