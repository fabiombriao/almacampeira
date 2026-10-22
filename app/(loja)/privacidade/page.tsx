import type { Metadata } from 'next'
import { getStoreSettings } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Privacidade' }

export default async function PrivacidadePage() {
  const s = await getStoreSettings()
  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="font-title text-4xl uppercase">Privacidade</h1>
      <div className="mt-4 whitespace-pre-line text-ink/85">{s.privacy_text}</div>
    </div>
  )
}
