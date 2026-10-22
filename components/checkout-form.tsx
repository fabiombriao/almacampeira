'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { placeOrderAction, quoteCartAction, type QuoteResult } from '@/app/(loja)/checkout/actions'
import { clearCart, useCart } from '@/lib/cart'
import { brl, maskPhone } from '@/lib/format'
import { captureClickIds, readTrackingContext, trackInitiateCheckout } from '@/lib/tracking/client'

const PAYMENTS = ['A combinar', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro']

export function CheckoutForm({ deliveryNote, pickupAddress }: { deliveryNote: string; pickupAddress: string }) {
  const router = useRouter()
  const lines = useCart()
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [phone, setPhone] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState('')
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const requestId = useRef(0)

  useEffect(() => {
    captureClickIds()
  }, [])

  const itemsPayload = useMemo(
    () => lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, personalizationText: l.personalizationText })),
    [lines],
  )

  // cotação autoritativa: o banco recalcula preços, taxa de personalização e cupom
  useEffect(() => {
    if (!itemsPayload.length) return
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      const result = await quoteCartAction({ items: itemsPayload, coupon_code: coupon || undefined })
      if (id !== requestId.current) return
      setQuote(result)
      if (result.ok && result.couponError) setCoupon('')
    }, 250)
    return () => clearTimeout(timer)
  }, [itemsPayload, coupon])

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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const get = (name: string) => String(form.get(name) ?? '').trim()

    startTransition(async () => {
      const result = await placeOrderAction({
        customer: { name: get('name'), phone: get('phone'), email: get('email') },
        fulfillment,
        address:
          fulfillment === 'delivery'
            ? { cep: get('cep'), street: get('street'), number: get('number'), complement: get('complement'), district: get('district'), city: get('city'), state: get('state').toUpperCase() }
            : undefined,
        payment_preference: get('payment'),
        notes: get('notes'),
        coupon_code: quote?.ok ? quote.couponCode ?? undefined : undefined,
        items: itemsPayload,
        tracking: readTrackingContext(),
        website: get('website'),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      trackInitiateCheckout({ eventId: result.eventId, value: result.total, contents: result.contents })
      clearCart()
      router.replace(`/pedido/${result.orderId}?wa=1`)
    })
  }

  const q = quote?.ok ? quote : null

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <section className="card space-y-4 p-4">
          <h2 className="font-title text-2xl">Seus dados</h2>
          <div>
            <label className="label" htmlFor="name">Nome completo *</label>
            <input id="name" name="name" className="input" required minLength={2} maxLength={120} autoComplete="name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="phone">WhatsApp / telefone *</label>
              <input id="phone" name="phone" className="input" required inputMode="tel" autoComplete="tel" placeholder="(51) 99999-0000" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="email">E-mail (opcional)</label>
              <input id="email" name="email" type="email" className="input" maxLength={160} autoComplete="email" />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="font-title text-2xl">Recebimento</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {([['pickup', 'Retirada na loja'], ['delivery', 'Entrega']] as const).map(([value, label]) => (
              <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${fulfillment === value ? 'border-primary bg-primary/5' : 'border-ink/20'}`}>
                <input type="radio" name="fulfillment" value={value} checked={fulfillment === value} onChange={() => setFulfillment(value)} />
                {label}
              </label>
            ))}
          </div>
          {fulfillment === 'pickup' ? (
            <p className="text-sm text-ink/70">Retirada em: {pickupAddress}</p>
          ) : (
            <>
              <p className="text-sm text-ink/70">{deliveryNote}</p>
              <div className="grid gap-4 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="cep">CEP</label>
                  <input id="cep" name="cep" className="input" inputMode="numeric" maxLength={9} autoComplete="postal-code" />
                </div>
                <div className="sm:col-span-4">
                  <label className="label" htmlFor="street">Rua *</label>
                  <input id="street" name="street" className="input" required maxLength={160} autoComplete="address-line1" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="number">Número *</label>
                  <input id="number" name="number" className="input" required maxLength={20} />
                </div>
                <div className="sm:col-span-4">
                  <label className="label" htmlFor="complement">Complemento</label>
                  <input id="complement" name="complement" className="input" maxLength={80} />
                </div>
                <div className="sm:col-span-3">
                  <label className="label" htmlFor="district">Bairro *</label>
                  <input id="district" name="district" className="input" required maxLength={80} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="city">Cidade *</label>
                  <input id="city" name="city" className="input" required maxLength={80} autoComplete="address-level2" />
                </div>
                <div className="sm:col-span-1">
                  <label className="label" htmlFor="state">UF</label>
                  <input id="state" name="state" className="input uppercase" maxLength={2} autoComplete="address-level1" />
                </div>
              </div>
            </>
          )}
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="font-title text-2xl">Pagamento e observações</h2>
          <p className="text-sm text-ink/70">O pagamento é combinado pelo WhatsApp. Aqui você só informa a sua preferência.</p>
          <div>
            <label className="label" htmlFor="payment">Forma de pagamento preferida</label>
            <select id="payment" name="payment" className="input" defaultValue="A combinar">
              {PAYMENTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="notes">Observações</label>
            <textarea id="notes" name="notes" className="input" rows={3} maxLength={500} />
          </div>
          {/* honeypot: invisível para pessoas */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Site
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </section>
      </div>

      <aside className="card h-fit space-y-4 p-4 lg:sticky lg:top-28">
        <h2 className="font-title text-2xl">Resumo</h2>
        {quote && !quote.ok && (
          <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {quote.error}{' '}
            <Link href="/carrinho" className="underline">
              Revisar carrinho
            </Link>
          </div>
        )}
        <ul className="space-y-2 text-sm">
          {(q ? q.lines : []).map((line, i) => (
            <li key={`${line.variant_id}-${i}`} className="flex justify-between gap-3">
              <span>
                {line.quantity}x {line.product_name}
                {line.variant_label && ` (${line.variant_label})`}
                {line.personalization_text && <span className="block text-ink/60">✎ “{line.personalization_text}”</span>}
              </span>
              <span className="shrink-0">{brl(line.line_total)}</span>
            </li>
          ))}
          {!q && !quote && <li className="text-ink/60">Calculando…</li>}
        </ul>

        <div className="flex gap-2">
          <input className="input" placeholder="Cupom de desconto" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} aria-label="Cupom de desconto" />
          <button type="button" className="btn btn-outline px-4" onClick={() => setCoupon(couponInput.trim())}>
            Aplicar
          </button>
        </div>
        {q?.couponError && <p className="text-sm text-red-700">{q.couponError}</p>}

        {q && (
          <dl className="space-y-1 border-t border-ink/10 pt-3">
            <div className="flex justify-between text-sm">
              <dt>Subtotal</dt>
              <dd>{brl(q.subtotal)}</dd>
            </div>
            {q.discount > 0 && (
              <div className="flex justify-between text-sm text-secondary">
                <dt>Cupom {q.couponCode}</dt>
                <dd>-{brl(q.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm text-ink/70">
              <dt>Entrega</dt>
              <dd>combinada no WhatsApp</dd>
            </div>
            <div className="flex justify-between text-xl font-bold">
              <dt>Total</dt>
              <dd className="text-primary">{brl(q.total)}</dd>
            </div>
          </dl>
        )}

        {error && (
          <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary w-full text-lg" disabled={pending || !q}>
          {pending ? 'Enviando…' : 'Enviar pedido pelo WhatsApp'}
        </button>
        <p className="text-xs text-ink/60">Ao enviar, seu pedido é registrado e o WhatsApp abre com a mensagem pronta. O pagamento e a entrega são combinados por lá.</p>
      </aside>
    </form>
  )
}
