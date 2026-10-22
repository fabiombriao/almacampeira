'use client'

import Link from 'next/link'
import { cartCount, useCart } from '@/lib/cart'

export function CartButton() {
  const count = cartCount(useCart())
  return (
    <Link href="/carrinho" className="relative inline-flex items-center gap-2 rounded-md border border-accent/50 px-3 py-2 text-sm text-light hover:bg-accent/10" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 7h12l-1 12H7L6 7z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      <span className="hidden sm:inline">Carrinho</span>
      {count > 0 && <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-bold text-dark">{count}</span>}
    </Link>
  )
}
