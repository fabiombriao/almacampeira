import Image from 'next/image'
import Link from 'next/link'
import { CartButton } from '@/components/cart-button'
import { getCategories, getStoreSettings } from '@/lib/data/catalog'

export async function SiteHeader() {
  const [settings, categories] = await Promise.all([getStoreSettings(), getCategories()])
  return (
    <header className="sticky top-0 z-40 border-b border-accent/30 bg-dark text-light">
      <div className="container-page flex items-center gap-4 py-2">
        <Link href="/" className="flex items-center gap-3" aria-label={`${settings.name}, página inicial`}>
          <Image src={settings.logo_url} alt="" width={48} height={48} className="h-12 w-12 rounded-sm object-cover" priority />
          <span className="font-title hidden text-xl uppercase tracking-[0.25em] text-accent sm:block">{settings.name}</span>
        </Link>
        <nav className="ml-6 hidden items-center gap-6 text-sm md:flex" aria-label="Categorias">
          <Link href="/produtos" className="hover:text-accent">Todos</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/categoria/${c.slug}`} className="hover:text-accent">
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <CartButton />
        </div>
      </div>
      <nav className="container-page flex gap-5 overflow-x-auto pb-2 text-sm md:hidden" aria-label="Categorias">
        <Link href="/produtos" className="whitespace-nowrap hover:text-accent">Todos</Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/categoria/${c.slug}`} className="whitespace-nowrap hover:text-accent">
            {c.name}
          </Link>
        ))}
      </nav>
    </header>
  )
}
