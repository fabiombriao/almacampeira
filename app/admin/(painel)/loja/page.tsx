import { ActionForm } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { formatPhone } from '@/lib/format'
import type { StoreSettings } from '@/lib/types'
import { saveStoreAction } from './actions'

// Painel autenticado: fora da validação de navegação instantânea (ver app/admin/layout.tsx)
export const instant = false

export const metadata = { title: 'Loja e WhatsApp' }

const VARIABLES: [string, string][] = [
  ['{numero_pedido}', 'número do pedido'],
  ['{itens}', 'lista de itens com personalização'],
  ['{subtotal}', 'subtotal'],
  ['{cupom}', 'linhas de subtotal e cupom (só se houver desconto)'],
  ['{total}', 'total do pedido'],
  ['{nome}', 'nome do cliente'],
  ['{telefone}', 'telefone do cliente'],
  ['{recebimento}', 'Entrega ou Retirada na loja'],
  ['{endereco}', 'endereço (só se for entrega)'],
  ['{pagamento}', 'forma de pagamento preferida'],
  ['{observacoes}', 'observações do cliente'],
]

export default async function LojaPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single()
  const s = data as StoreSettings

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-title text-4xl uppercase">Loja e WhatsApp</h1>
      <ActionForm action={saveStoreAction} submitLabel="Salvar configurações" className="space-y-6">
        <section className="card space-y-4 p-4">
          <h2 className="font-title text-2xl">Dados da loja</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Nome da loja</label>
              <input id="name" name="name" className="input" defaultValue={s.name} required />
            </div>
            <div>
              <label className="label" htmlFor="tagline">Slogan</label>
              <input id="tagline" name="tagline" className="input" defaultValue={s.tagline} />
            </div>
            <div>
              <label className="label" htmlFor="instagram_url">Instagram (link)</label>
              <input id="instagram_url" name="instagram_url" className="input" defaultValue={s.instagram_url} />
            </div>
            <div>
              <label className="label" htmlFor="business_hours">Horário de atendimento</label>
              <input id="business_hours" name="business_hours" className="input" defaultValue={s.business_hours} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="pickup_address">Endereço para retirada</label>
              <input id="pickup_address" name="pickup_address" className="input" defaultValue={s.pickup_address} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="delivery_note">Aviso sobre entrega (aparece no carrinho e no checkout)</label>
              <input id="delivery_note" name="delivery_note" className="input" defaultValue={s.delivery_note} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="about_text">Texto institucional (rodapé e SEO)</label>
              <textarea id="about_text" name="about_text" className="input" rows={2} defaultValue={s.about_text} />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="font-title text-2xl">WhatsApp</h2>
          <div>
            <label className="label" htmlFor="whatsapp_number">Número que recebe os pedidos (com DDD)</label>
            <input id="whatsapp_number" name="whatsapp_number" className="input max-w-xs" defaultValue={formatPhone(s.whatsapp_number)} inputMode="tel" required />
            <p className="mt-1 text-xs text-ink/60">O código do Brasil (55) é adicionado automaticamente.</p>
          </div>
          <div>
            <label className="label" htmlFor="message_template">Modelo da mensagem</label>
            <textarea id="message_template" name="message_template" className="input font-mono text-sm" rows={12} defaultValue={s.message_template} required />
            <p className="mt-1 text-xs text-ink/60">Use *texto* para negrito. Variáveis disponíveis:</p>
            <ul className="mt-1 grid gap-x-6 text-xs text-ink/70 sm:grid-cols-2">
              {VARIABLES.map(([v, d]) => (
                <li key={v}><code>{v}</code>: {d}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="font-title text-2xl">Privacidade</h2>
          <div>
            <label className="label" htmlFor="privacy_text">Texto da página de Privacidade</label>
            <textarea id="privacy_text" name="privacy_text" className="input" rows={7} defaultValue={s.privacy_text} />
          </div>
        </section>
      </ActionForm>
    </div>
  )
}
