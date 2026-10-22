import { ActionForm } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import type { Coupon } from '@/lib/types'
import { deleteCouponAction, saveCouponAction } from './actions'

// Painel autenticado: fora da validação de navegação instantânea (ver app/admin/layout.tsx)
export const instant = false

export const metadata = { title: 'Cupons' }

const toDateInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10) : '')

function CouponFields({ c }: { c?: Coupon }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div>
        <label className="label">Código</label>
        <input name="code" className="input uppercase" defaultValue={c?.code} required />
      </div>
      <div>
        <label className="label">Tipo</label>
        <select name="type" className="input" defaultValue={c?.type ?? 'percent'}>
          <option value="percent">Porcentagem (%)</option>
          <option value="fixed">Valor fixo (R$)</option>
        </select>
      </div>
      <div>
        <label className="label">Valor</label>
        <input name="value" className="input" inputMode="decimal" defaultValue={c ? String(c.value).replace('.', ',') : ''} required />
      </div>
      <div>
        <label className="label">Pedido mínimo (R$)</label>
        <input name="min_order" className="input" inputMode="decimal" defaultValue={c ? String(c.min_order).replace('.', ',') : '0'} />
      </div>
      <div>
        <label className="label">Válido a partir de</label>
        <input name="starts_at" type="date" className="input" defaultValue={toDateInput(c?.starts_at ?? null)} />
      </div>
      <div>
        <label className="label">Válido até</label>
        <input name="ends_at" type="date" className="input" defaultValue={toDateInput(c?.ends_at ?? null)} />
      </div>
      <div>
        <label className="label">Limite de usos</label>
        <input name="max_uses" className="input" inputMode="numeric" defaultValue={c?.max_uses ?? ''} placeholder="sem limite" />
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={c?.active ?? true} /> Ativo
      </label>
    </div>
  )
}

export default async function CuponsPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
  const coupons = (data ?? []) as Coupon[]

  return (
    <div className="space-y-6">
      <h1 className="font-title text-4xl uppercase">Cupons e promoções</h1>
      <p className="text-sm text-ink/70">O uso do cupom só é contado quando você confirma o pedido. Para uma promoção de preço, use o campo &quot;Preço promocional&quot; do produto.</p>

      <section className="card p-4">
        <h2 className="font-title text-2xl">Novo cupom</h2>
        <ActionForm action={saveCouponAction} submitLabel="Criar cupom" className="mt-3 space-y-4">
          <CouponFields />
        </ActionForm>
      </section>

      <ul className="space-y-3">
        {coupons.map((c) => (
          <li key={c.id} className="card space-y-3 p-4">
            <p className="text-sm text-ink/70">Usado {c.used_count}x{c.max_uses ? ` de ${c.max_uses}` : ''}</p>
            <ActionForm action={saveCouponAction} className="space-y-3">
              <CouponFields c={c} />
            </ActionForm>
            <ActionForm action={deleteCouponAction} submitLabel="Excluir cupom" danger confirmMessage={`Excluir o cupom ${c.code}?`} className="inline-flex">
              <input type="hidden" name="id" value={c.id} />
            </ActionForm>
          </li>
        ))}
        {!coupons.length && <li className="card p-6 text-center text-ink/60">Nenhum cupom cadastrado.</li>}
      </ul>
    </div>
  )
}
