import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { brl, formatDateTime, formatPhone, STATUS_LABEL, toInternationalPhone } from '@/lib/format'
import type { Order, OrderItem } from '@/lib/types'
import { formatAddress } from '@/lib/whatsapp'
import { changeStatusAction } from '../actions'

// Painel autenticado: fora da validação de navegação instantânea (ver app/admin/layout.tsx)
export const instant = false

export const metadata = { title: 'Pedido' }

function StatusButton({ id, status, label, confirm, danger }: { id: string; status: string; label: string; confirm?: string; danger?: boolean }) {
  return (
    <ActionForm action={changeStatusAction} submitLabel={label} confirmMessage={confirm} danger={danger} className="inline-flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
    </ActionForm>
  )
}

export default async function PedidoAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireAdmin()
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const [{ data: order }, { data: items }, { data: history }, { data: events }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).maybeSingle(),
    supabase.from('order_items').select('*').eq('order_id', id).order('product_name'),
    supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at'),
    supabase.from('tracking_events').select('*').eq('order_id', id).order('created_at', { ascending: false }),
  ])
  if (!order) notFound()
  const o = order as Order
  const list = (items ?? []) as OrderItem[]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/pedidos" className="text-sm underline">← Pedidos</Link>
        <h1 className="font-title mt-2 text-4xl uppercase">
          Pedido #{o.number} {o.is_test && <span className="ml-2 rounded bg-accent/40 px-2 text-sm normal-case">teste</span>}
        </h1>
        <p className="text-ink/70">
          {formatDateTime(o.created_at)} · Status: <strong>{STATUS_LABEL[o.status]}</strong>
        </p>
      </div>

      <section className="card space-y-3 p-4">
        <h2 className="font-title text-2xl">Ações</h2>
        <div className="flex flex-wrap gap-4">
          {o.status === 'novo' && (
            <StatusButton id={o.id} status="confirmado" label="Confirmar pedido (baixa o estoque)" confirm="Confirmar o pedido e baixar o estoque?" />
          )}
          {o.status === 'confirmado' && (
            <StatusButton id={o.id} status="entregue" label="Marcar como entregue" confirm="Marcar como entregue? A conversão de compra será enviada às plataformas de anúncio." />
          )}
          {(o.status === 'novo' || o.status === 'confirmado') && (
            <StatusButton
              id={o.id}
              status="cancelado"
              label="Cancelar pedido"
              danger
              confirm={o.status === 'confirmado' ? 'Cancelar o pedido? O estoque será devolvido.' : 'Cancelar o pedido?'}
            />
          )}
          {(o.status === 'entregue' || o.status === 'cancelado') && <p className="text-sm text-ink/70">Este pedido está finalizado.</p>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-2 p-4 text-sm">
          <h2 className="font-title text-2xl">Cliente</h2>
          <p><strong>{o.customer_name}</strong></p>
          <p>
            Telefone: {formatPhone(o.customer_phone)}{' '}
            <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${toInternationalPhone(o.customer_phone)}`}>
              abrir conversa
            </a>
          </p>
          {o.customer_email && <p>E-mail: {o.customer_email}</p>}
          <p>Recebimento: {o.fulfillment === 'delivery' ? 'Entrega' : 'Retirada na loja'}</p>
          {o.fulfillment === 'delivery' && <p>Endereço: {formatAddress(o.address)}</p>}
          {o.payment_preference && <p>Pagamento preferido: {o.payment_preference}</p>}
          {o.notes && <p>Observações: {o.notes}</p>}
        </section>

        <section className="card p-4 text-sm">
          <h2 className="font-title text-2xl">Itens</h2>
          <ul className="mt-2 divide-y divide-ink/10">
            {list.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span>
                  {i.quantity}x {i.product_name}
                  {i.variant_label && ` (${i.variant_label})`}
                  {i.personalization_text && (
                    <span className="block font-semibold text-primary">
                      ✎ Personalização: “{i.personalization_text}”{Number(i.personalization_fee) > 0 && ` (+${brl(i.personalization_fee)} cada)`}
                    </span>
                  )}
                </span>
                <span className="shrink-0">{brl(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-ink/10 pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{brl(o.subtotal)}</dd></div>
            {Number(o.discount) > 0 && <div className="flex justify-between text-secondary"><dt>Cupom {o.coupon_code}</dt><dd>-{brl(o.discount)}</dd></div>}
            <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd className="text-primary">{brl(o.total)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-ink/60">Frete não incluso: combinado com o cliente pelo WhatsApp.</p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4 text-sm">
          <h2 className="font-title text-2xl">Histórico</h2>
          <ul className="mt-2 space-y-1">
            {(history ?? []).map((h) => (
              <li key={h.id}>
                {formatDateTime(h.created_at)}: {h.from_status ? `${STATUS_LABEL[h.from_status]} → ` : ''}
                <strong>{STATUS_LABEL[h.to_status]}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4 text-sm">
          <h2 className="font-title text-2xl">Conversões enviadas</h2>
          <ul className="mt-2 space-y-1">
            {(events ?? []).map((e) => (
              <li key={e.id}>
                <span className="font-semibold">{e.platform}</span> · {e.event_name} ·{' '}
                <span className={e.status === 'failed' ? 'text-red-700' : e.status === 'sent' ? 'text-secondary' : 'text-ink/60'}>{e.status}</span>
                <span className="block text-xs text-ink/60">{e.detail}</span>
              </li>
            ))}
            {!events?.length && <li className="text-ink/60">Nenhum evento registrado.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
