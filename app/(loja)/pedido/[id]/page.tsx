import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { OrderActions } from '@/components/order-actions'
import { brl, formatDateTime, STATUS_LABEL } from '@/lib/format'
import { formatAddress } from '@/lib/whatsapp'
import { getPublicOrder } from '@/lib/public-order'

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Seu pedido', robots: { index: false, follow: false } }

export default function PedidoPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container-page py-8"><div className="h-40 animate-pulse rounded bg-dark/10" /></div>}>
      <PedidoContent params={params} />
    </Suspense>
  )
}

async function PedidoContent({ params }: Props) {
  const { id } = await params
  const data = await getPublicOrder(id)
  if (!data) notFound()
  const { order, items } = data

  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="font-title text-4xl uppercase">Pedido #{order.number}</h1>
      <p className="mt-1 text-ink/70">
        Registrado em {formatDateTime(order.created_at)} · Status: <strong>{STATUS_LABEL[order.status]}</strong>
      </p>

      <div className="card mt-6 space-y-3 border-secondary bg-secondary/5 p-4">
        <p className="font-semibold">Falta só um passo: enviar o pedido pelo WhatsApp.</p>
        <p className="text-sm text-ink/80">
          Se o WhatsApp não abriu sozinho, use o botão abaixo. O pagamento e {order.fulfillment === 'delivery' ? 'o valor da entrega' : 'a retirada'} são combinados por lá.
        </p>
        <OrderActions whatsappUrl={data.whatsappUrl} message={data.message} />
      </div>

      <section className="card mt-6 p-4">
        <h2 className="font-title text-2xl">Itens</h2>
        <ul className="mt-3 divide-y divide-ink/10">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-2 text-sm">
              <span>
                {item.quantity}x {item.product_name}
                {item.variant_label && ` (${item.variant_label})`}
                {item.personalization_text && <span className="block text-ink/60">✎ “{item.personalization_text}”</span>}
              </span>
              <span className="shrink-0">{brl(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-ink/10 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{brl(order.subtotal)}</dd>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-secondary">
              <dt>Cupom {order.coupon_code}</dt>
              <dd>-{brl(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <dt>Total</dt>
            <dd className="text-primary">{brl(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="card mt-6 p-4 text-sm">
        <h2 className="font-title text-2xl">Recebimento</h2>
        {order.fulfillment === 'delivery' ? (
          <p className="mt-2">Entrega em: {formatAddress(order.address)}</p>
        ) : (
          <p className="mt-2">Retirada em: {data.pickupAddress}</p>
        )}
        <p className="mt-1 text-ink/70">Atendimento: {data.businessHours}</p>
      </section>

      <Link href="/produtos" className="mt-6 inline-block text-sm underline">
        Voltar à loja
      </Link>
    </div>
  )
}
