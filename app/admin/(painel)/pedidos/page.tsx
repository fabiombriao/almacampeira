import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { brl, formatDateTime, STATUS_LABEL } from '@/lib/format'

export const metadata = { title: 'Pedidos' }

const TABS = [
  { value: '', label: 'Todos' },
  { value: 'novo', label: 'Novos' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'entregue', label: 'Entregues' },
  { value: 'cancelado', label: 'Cancelados' },
]

const BADGE: Record<string, string> = {
  novo: 'bg-primary text-white',
  confirmado: 'bg-secondary text-white',
  entregue: 'bg-dark text-accent',
  cancelado: 'bg-ink/15 text-ink',
}

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = '', q = '' } = await searchParams
  const { supabase } = await requireAdmin()

  let query = supabase
    .from('orders')
    .select('id, number, customer_name, customer_phone, total, status, fulfillment, is_test, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (status && STATUS_LABEL[status]) query = query.eq('status', status)
  const term = q.trim().replace(/[%,()]/g, '')
  if (term) {
    const digits = term.replace(/\D/g, '')
    query = query.or(
      [`customer_name.ilike.%${term}%`, digits ? `customer_phone.ilike.%${digits}%` : null, /^\d+$/.test(term) ? `number.eq.${term}` : null].filter(Boolean).join(','),
    )
  }
  const { data: orders } = await query

  return (
    <div className="space-y-5">
      <h1 className="font-title text-4xl uppercase">Pedidos</h1>
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-2" aria-label="Filtrar por status">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={t.value ? `/admin/pedidos?status=${t.value}` : '/admin/pedidos'}
              className={`rounded-full border px-4 py-1.5 text-sm ${status === t.value ? 'border-primary bg-primary text-white' : 'border-ink/30 bg-white hover:border-primary'}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="ml-auto flex gap-2" action="/admin/pedidos">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} className="input w-56" placeholder="Nome, telefone ou nº" aria-label="Buscar pedido" />
          <button className="btn btn-outline px-4" type="submit">Buscar</button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/70">
            <tr>
              <th className="p-3">Nº</th>
              <th className="p-3">Data</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Recebimento</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-b border-ink/5 hover:bg-primary/5">
                <td className="p-3 font-semibold">
                  <Link href={`/admin/pedidos/${o.id}`} className="underline">#{o.number}</Link>
                  {o.is_test && <span className="ml-2 rounded bg-accent/40 px-1.5 text-xs">teste</span>}
                </td>
                <td className="p-3 whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                <td className="p-3">{o.customer_name}</td>
                <td className="p-3">{o.fulfillment === 'delivery' ? 'Entrega' : 'Retirada'}</td>
                <td className="p-3 text-right">{brl(o.total)}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${BADGE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </td>
              </tr>
            ))}
            {!orders?.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink/60">Nenhum pedido encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
