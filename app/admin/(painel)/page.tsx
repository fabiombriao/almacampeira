import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { brl, daysAgoIso, formatDateTime, STATUS_LABEL } from '@/lib/format'
import { GROUP_EVENT_NAME } from '@/lib/group'

// Painel autenticado: fora da validação de navegação instantânea (ver app/admin/layout.tsx)
export const instant = false

export const metadata = { title: 'Início' }

export default async function DashboardPage() {
  const { supabase } = await requireAdmin()
  const since = daysAgoIso(30)

  const count = (status: string) => supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', status).eq('is_test', false)
  const [novo, confirmado, entregue, revenue, recent, lowStock, groupClicks] = await Promise.all([
    count('novo'),
    count('confirmado'),
    count('entregue'),
    supabase.from('orders').select('total').in('status', ['confirmado', 'entregue']).eq('is_test', false).gte('created_at', since).limit(2000),
    supabase.from('orders').select('id, number, customer_name, total, status, created_at').order('created_at', { ascending: false }).limit(6),
    supabase
      .from('product_variants')
      .select('id, sku, option_values, stock_quantity, product:products!inner(id, name, active)')
      .lte('stock_quantity', 3)
      .eq('active', true)
      .eq('product.active', true)
      .order('stock_quantity')
      .limit(8),
    // um registro por clique no /bazar (a Meta recebe o mesmo evento pela API de Conversões)
    supabase.from('tracking_events').select('id', { count: 'exact', head: true }).eq('event_name', GROUP_EVENT_NAME).gte('created_at', daysAgoIso(7)),
  ])
  const total30 = (revenue.data ?? []).reduce((sum, o) => sum + Number(o.total), 0)

  const cards = [
    { label: 'Pedidos novos', value: novo.count ?? 0, href: '/admin/pedidos?status=novo', highlight: (novo.count ?? 0) > 0 },
    { label: 'Confirmados', value: confirmado.count ?? 0, href: '/admin/pedidos?status=confirmado' },
    { label: 'Entregues', value: entregue.count ?? 0, href: '/admin/pedidos?status=entregue' },
    { label: 'Vendido em 30 dias', value: brl(total30), href: '/admin/pedidos' },
    { label: 'Cliques no grupo (7 dias)', value: groupClicks.count ?? 0, href: '/admin/loja' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="font-title text-4xl uppercase">Início</h1>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className={`card block p-4 hover:shadow-md ${c.highlight ? 'border-primary bg-primary/5' : ''}`}>
              <p className="text-sm text-ink/70">{c.label}</p>
              <p className="mt-1 text-2xl font-bold text-primary">{c.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-title text-2xl">Últimos pedidos</h2>
          <ul className="mt-3 divide-y divide-ink/10 text-sm">
            {(recent.data ?? []).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className="flex items-center justify-between gap-3 py-2 hover:text-primary">
                  <span>
                    <strong>#{o.number}</strong> · {o.customer_name}
                    <span className="block text-xs text-ink/60">{formatDateTime(o.created_at)}</span>
                  </span>
                  <span className="text-right">
                    {brl(o.total)}
                    <span className="block text-xs text-ink/60">{STATUS_LABEL[o.status]}</span>
                  </span>
                </Link>
              </li>
            ))}
            {!recent.data?.length && <li className="py-4 text-ink/60">Nenhum pedido ainda.</li>}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-title text-2xl">Estoque baixo</h2>
          <ul className="mt-3 divide-y divide-ink/10 text-sm">
            {(lowStock.data ?? []).map((v) => {
              const product = v.product as unknown as { id: string; name: string }
              const label = Object.values(v.option_values as Record<string, string>).join(' / ')
              return (
                <li key={v.id} className="flex items-center justify-between py-2">
                  <Link href={`/admin/produtos/${product.id}`} className="hover:text-primary">
                    {product.name}
                    {label && ` (${label})`}
                  </Link>
                  <span className={v.stock_quantity === 0 ? 'font-bold text-red-700' : 'text-ink/70'}>{v.stock_quantity === 0 ? 'Esgotado' : `${v.stock_quantity} un.`}</span>
                </li>
              )
            })}
            {!lowStock.data?.length && <li className="py-4 text-ink/60">Tudo com estoque tranquilo.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
