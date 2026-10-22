import { cacheLife, cacheTag } from 'next/cache'
import Link from 'next/link'
import { getStoreSettings } from '@/lib/data/catalog'

export async function SiteFooter() {
  'use cache'
  cacheTag('settings')
  cacheLife('days')
  const s = await getStoreSettings()
  return (
    <footer className="mt-16 bg-dark text-light">
      <div className="container-page grid gap-8 py-10 text-sm md:grid-cols-3">
        <div>
          <p className="font-title text-2xl uppercase tracking-[0.25em] text-accent">{s.name}</p>
          <p className="mt-2 text-light/80">{s.tagline}</p>
          <p className="mt-3 text-light/70">{s.about_text}</p>
        </div>
        <div>
          <p className="font-semibold text-accent">Atendimento</p>
          <p className="mt-2 text-light/80">{s.business_hours}</p>
          <p className="mt-2 text-light/80">Retirada: {s.pickup_address}</p>
          <p className="mt-2 text-light/80">{s.delivery_note}</p>
        </div>
        <div>
          <p className="font-semibold text-accent">Links</p>
          <ul className="mt-2 space-y-1 text-light/80">
            {s.instagram_url && (
              <li>
                <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                  Instagram
                </a>
              </li>
            )}
            <li>
              <Link href="/privacidade" className="hover:text-accent">Privacidade</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-accent/20 py-4 text-center text-xs text-light/60">
        © {new Date().getFullYear()} {s.name}. Pedidos finalizados pelo WhatsApp.
      </div>
    </footer>
  )
}
