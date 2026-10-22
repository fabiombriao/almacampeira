import Image from 'next/image'
import Link from 'next/link'
import { ProductCard } from '@/components/product-card'
import { ProductImage } from '@/components/product-image'
import { getBanners, getCategories, getProducts, getStoreSettings } from '@/lib/data/catalog'

async function Hero() {
  const [settings, banners] = await Promise.all([getStoreSettings(), getBanners()])

  if (banners.length) {
    return (
      <section aria-label="Destaques" className="flex snap-x snap-mandatory overflow-x-auto bg-dark">
        {banners.map((b, i) => (
          <div key={b.id} className="relative aspect-[16/8] min-h-64 w-full shrink-0 snap-start sm:aspect-[16/6]">
            <ProductImage src={b.image_url} alt={b.title ?? settings.name} sizes="100vw" priority={i === 0} />
            {(b.title || b.subtitle || b.link_url) && (
              <div className="absolute inset-0 flex flex-col items-start justify-end gap-2 bg-gradient-to-t from-dark/80 via-dark/20 to-transparent p-6 text-light sm:p-10">
                {b.title && <h2 className="font-title text-3xl uppercase sm:text-5xl">{b.title}</h2>}
                {b.subtitle && <p className="max-w-xl text-light/90">{b.subtitle}</p>}
                {b.link_url && (
                  <Link href={b.link_url} className="btn btn-primary">
                    Ver mais
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="bg-dark text-light">
      <div className="container-page grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
        <div>
          <p className="font-title text-sm uppercase tracking-[0.4em] text-accent">Tradição que faz parte da sua história</p>
          <h1 className="font-title mt-3 text-4xl uppercase leading-tight sm:text-6xl">{settings.name}</h1>
          <p className="mt-4 max-w-md text-lg text-light/85">{settings.tagline}.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/produtos" className="btn btn-primary">
              Ver produtos
            </Link>
            {settings.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="btn border border-accent text-accent hover:bg-accent hover:text-dark">
                Instagram
              </a>
            )}
          </div>
        </div>
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-accent/40 shadow-2xl">
          <Image src={settings.logo_url} alt={`Logo ${settings.name}`} width={600} height={600} priority className="h-auto w-full" />
        </div>
      </div>
    </section>
  )
}

async function Categories() {
  const categories = await getCategories()
  if (!categories.length) return null
  return (
    <section className="container-page py-10">
      <h2 className="font-title text-3xl uppercase">Categorias</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/categoria/${c.slug}`}
              className="card flex h-28 items-center justify-center bg-dark text-center font-title text-xl uppercase tracking-widest text-accent transition-transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

async function Featured() {
  let products = await getProducts({ featuredOnly: true, limit: 8 })
  if (!products.length) products = await getProducts({ limit: 8 })
  if (!products.length) {
    return (
      <section className="container-page py-10">
        <p className="card p-8 text-center text-ink/70">Em breve, novidades por aqui.</p>
      </section>
    )
  }
  return (
    <section className="container-page py-6">
      <div className="flex items-end justify-between">
        <h2 className="font-title text-3xl uppercase">Destaques</h2>
        <Link href="/produtos" className="text-sm underline">
          Ver todos
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <Featured />
    </>
  )
}
