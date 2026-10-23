'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ProductImage } from '@/components/product-image'
import { useProductSelection } from '@/components/product-selection'
import { addToCart } from '@/lib/cart'
import { brl } from '@/lib/format'
import { productCover, variantCover } from '@/lib/gallery'
import { cartLineKey, variantLabel, variantOriginalPrice, variantPrice } from '@/lib/pricing'
import { trackAddToCart, trackViewContent } from '@/lib/tracking/client'
import type { ProductFull } from '@/lib/types'

export function PurchasePanel({ product }: { product: ProductFull }) {
  const variants = product.variants
  const { variantId, selectVariant } = useProductSelection()
  const [text, setText] = useState('')
  // quantidade e aviso "adicionado" valem para a variação em que foram feitos: trocar de variação zera
  const [qty, setQty] = useState({ variantId, n: 1 })
  const [addedFor, setAddedFor] = useState<string | null>(null)
  const quantity = qty.variantId === variantId ? qty.n : 1
  const added = addedFor === variantId
  const setQuantity = (update: (current: number) => number) => setQty({ variantId, n: update(quantity) })

  const variant = useMemo(() => variants.find((v) => v.id === variantId), [variants, variantId])
  const unit = variant ? variantPrice(product, variant) : Number(product.base_price)
  const original = variant ? variantOriginalPrice(product, variant) : null
  const stock = variant?.stock_quantity ?? 0
  const trimmed = text.trim()
  const fee = product.allows_personalization && trimmed ? Number(product.personalization_fee) : 0
  const missingText = product.allows_personalization && product.personalization_required && !trimmed
  const canAdd = Boolean(variant) && stock > 0 && !missingText

  useEffect(() => {
    trackViewContent({ id: product.id, name: product.name, price: unit })
    // só na abertura da página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  function onAdd() {
    if (!variant || !canAdd) return
    const personalization = product.allows_personalization && trimmed ? trimmed : null
    addToCart({
      key: cartLineKey(variant.id, personalization),
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantLabel: variantLabel(variant),
      image: variantCover(product, variant.id) ?? productCover(product),
      unitPrice: unit,
      personalizationText: personalization,
      personalizationFee: fee,
      quantity,
      maxStock: stock,
    })
    trackAddToCart({ id: product.id, name: product.name, price: unit + fee, quantity })
    setAddedFor(variant.id)
  }

  const showChips = variants.length > 1 || (variants[0] && Object.keys(variants[0].option_values).length > 0)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-3xl font-bold text-primary">
          {original && <span className="mr-2 text-lg font-normal text-ink/50 line-through">{brl(original)}</span>}
          {brl(unit + fee)}
        </p>
        {fee > 0 && (
          <p className="text-sm text-ink/70">
            {brl(unit)} + {brl(fee)} de personalização
          </p>
        )}
      </div>

      {showChips && (
        <fieldset>
          <legend className="label">{product.option_names.length ? product.option_names.join(' / ') : 'Opção'}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const soldOut = v.stock_quantity <= 0
              const selected = v.id === variantId
              const photo = variantCover(product, v.id)
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => selectVariant(v.id)}
                  aria-pressed={selected}
                  className={`rounded-md border text-sm transition-colors ${photo ? 'flex w-24 flex-col items-center gap-1 p-1.5' : 'px-4 py-2'} ${
                    selected ? 'border-primary bg-primary text-white' : 'border-ink/30 bg-white hover:border-primary'
                  } ${soldOut ? 'cursor-not-allowed line-through opacity-40' : ''}`}
                >
                  {photo && (
                    <span className="relative block aspect-square w-full overflow-hidden rounded bg-dark/10">
                      <ProductImage src={photo} alt="" sizes="96px" />
                    </span>
                  )}
                  <span>{variantLabel(v) ?? 'Único'}</span>
                  {soldOut && <span className="sr-only"> (esgotado)</span>}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {product.allows_personalization && (
        <div>
          <label htmlFor="personalization" className="label">
            {product.personalization_label}
            {product.personalization_required ? ' (obrigatório)' : ' (opcional)'}
          </label>
          <input
            id="personalization"
            className="input"
            value={text}
            maxLength={product.personalization_max_length}
            onChange={(e) => {
              setText(e.target.value)
              setAddedFor(null)
            }}
            placeholder="Digite aqui"
          />
          <p className="mt-1 text-xs text-ink/60">
            {text.length}/{product.personalization_max_length} caracteres
            {Number(product.personalization_fee) > 0 && ` · acréscimo de ${brl(product.personalization_fee)} por unidade personalizada`}
          </p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="inline-flex items-center rounded-md border border-ink/30 bg-white">
          <button type="button" className="px-3 py-2 text-lg" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade" disabled={quantity <= 1}>
            −
          </button>
          <span className="min-w-8 text-center" aria-live="polite">{quantity}</span>
          <button type="button" className="px-3 py-2 text-lg" onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))} aria-label="Aumentar quantidade" disabled={quantity >= stock}>
            +
          </button>
        </div>
        <p className="text-sm text-ink/70">
          {stock <= 0 ? 'Esgotado' : stock <= 3 ? `Últimas ${stock} unidades` : 'Em estoque'}
        </p>
      </div>

      <button type="button" className="btn btn-primary w-full text-lg" disabled={!canAdd} onClick={onAdd}>
        {stock <= 0 ? 'Esgotado' : missingText ? 'Informe a personalização' : 'Adicionar ao carrinho'}
      </button>

      {added && (
        <div role="status" className="card flex flex-wrap items-center justify-between gap-3 border-secondary bg-secondary/10 p-3 text-sm">
          <span>✓ Adicionado ao carrinho.</span>
          <Link href="/carrinho" className="btn btn-outline px-4 py-1.5">
            Ver carrinho
          </Link>
        </div>
      )}
    </div>
  )
}
