import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } }

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink/60">Carregando…</div>}>
      {children}
    </Suspense>
  )
}
