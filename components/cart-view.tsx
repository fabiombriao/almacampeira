'use client'

import Link from 'next/link'
import { ProductImage } from '@/components/product-image'
import { cartSubtotal, lineTotal, removeLine, setLineQuantity, useCart } from '@/lib/cart'
import { brl } from '@/lib/format'

export function CartView({ deliveryNote }: { deliveryNote: string }) {
  const lines = useCart()

  if (!lines.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg">Seu carrinho está vazio.</p>
        <Link href="/produtos" className="btn btn-primary mt-4">
          Ver produtos
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <ul className="space-y-3">
        {lines.map((line) => (
          <li key={line.key} className="card flex gap-4 p-3">
            <Link href={`/produto/${line.slug}`} className="relative h-24 w-20 shrink-0 overflow-hidden rounded bg-dark/10">
              {line.image && <ProductImage src={line.image} alt={line.name} sizes="80px" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/produto/${line.slug}`} className="font-semibold hover:text-primary">
                {line.name}
              </Link>
              {line.variantLabel && <p className="text-sm text-ink/70">{line.variantLabel}</p>}
              {line.personalizationText && (
                <p className="text-sm text-ink/70">
                  ✎ “{line.personalizationText}”{line.personalizationFee > 0 && ` (+${brl(line.personalizationFee)} cada)`}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="inline-flex items-center rounded border border-ink/30">
                  <button type="button" className="px-2.5 py-1" onClick={() => setLineQuantity(line.key, line.quantity - 1)} aria-label={`Diminuir quantidade de ${line.name}`}>
                    −
                  </button>
                  <span className="min-w-7 text-center text-sm">{line.quantity}</span>
                  <button
                    type="button"
                    className="px-2.5 py-1"
                    disabled={line.quantity >= line.maxStock}
                    onClick={() => setLineQuantity(line.key, line.quantity + 1)}
                    aria-label={`Aumentar quantidade de ${line.name}`}
                  >
                    +
                  </button>
                </div>
                <p className="font-bold text-primary">{brl(lineTotal(line))}</p>
                <button type="button" className="text-sm text-ink/60 underline hover:text-primary" onClick={() => removeLine(line.key)}>
                  Remover
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="card h-fit space-y-3 p-4">
        <div className="flex justify-between text-lg">
          <span>Subtotal</span>
          <strong>{brl(cartSubtotal(lines))}</strong>
        </div>
        <p className="text-sm text-ink/70">{deliveryNote}</p>
        <Link href="/checkout" className="btn btn-primary w-full">
          Finalizar pedido
        </Link>
        <Link href="/produtos" className="block text-center text-sm underline">
          Continuar comprando
        </Link>
      </aside>
    </div>
  )
}
