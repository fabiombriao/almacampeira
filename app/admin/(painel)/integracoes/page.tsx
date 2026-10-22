import Link from 'next/link'
import { ActionForm } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { formatDateTime } from '@/lib/format'
import { serviceClient } from '@/lib/supabase/admin'
import { savePublicIdsAction, saveSecretsAction } from './actions'

// Painel autenticado: fora da validação de navegação instantânea (ver app/admin/layout.tsx)
export const instant = false

export const metadata = { title: 'Integrações' }

function SecretField({ name, label, configured, hint }: { name: string; label: string; configured: boolean; hint?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label} {configured && <span className="ml-1 rounded bg-secondary/15 px-1.5 text-xs font-normal text-secondary">configurado</span>}
      </label>
      <input id={name} name={name} className="input" type="password" autoComplete="off" placeholder={configured ? '•••••••• (deixe em branco para manter)' : ''} />
      {hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
    </div>
  )
}

export default async function IntegracoesPage() {
  const { supabase } = await requireAdmin()
  const [{ data: settings }, { data: events }] = await Promise.all([
    supabase.from('store_settings').select('meta_pixel_id, ga4_measurement_id').eq('id', 1).single(),
    supabase.from('tracking_events').select('id, order_id, platform, event_name, status, detail, created_at').order('created_at', { ascending: false }).limit(30),
  ])
  // segredos: só o servidor lê, e só dizemos ao navegador se estão preenchidos
  const { data: secrets } = await serviceClient().from('integration_secrets').select('*').eq('id', 1).single()
  const has = (k: string) => Boolean(secrets?.[k])

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-title text-4xl uppercase">Integrações de conversão</h1>
      <p className="text-sm text-ink/70">
        <strong>InitiateCheckout</strong> é enviado quando o cliente manda o pedido pelo WhatsApp. <strong>Purchase</strong> é enviado quando você marca o pedido como <em>entregue</em>. Pedidos cujo nome começa com [TESTE] não disparam nada.
      </p>

      <section className="card space-y-4 p-4">
        <h2 className="font-title text-2xl">Tags da loja (públicas)</h2>
        <ActionForm action={savePublicIdsAction} submitLabel="Salvar IDs" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="meta_pixel_id">ID do Pixel da Meta</label>
              <input id="meta_pixel_id" name="meta_pixel_id" className="input" defaultValue={settings?.meta_pixel_id ?? ''} inputMode="numeric" />
            </div>
            <div>
              <label className="label" htmlFor="ga4_measurement_id">ID de medição do GA4 (G-…)</label>
              <input id="ga4_measurement_id" name="ga4_measurement_id" className="input" defaultValue={settings?.ga4_measurement_id ?? ''} />
            </div>
          </div>
        </ActionForm>
      </section>

      <ActionForm action={saveSecretsAction} submitLabel="Salvar credenciais" className="space-y-6">
        <section className="card space-y-4 p-4">
          <h2 className="font-title text-2xl">Meta (API de Conversões)</h2>
          <SecretField name="meta_capi_token" label="Token de acesso da API de Conversões" configured={has('meta_capi_token')} />
          <SecretField name="meta_test_event_code" label="Código de evento de teste (opcional)" configured={has('meta_test_event_code')} hint="Enquanto estiver preenchido, os eventos aparecem em Gerenciador de Eventos > Testar eventos. Apague com “-” ao ir para produção." />
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="font-title text-2xl">Google Analytics 4 (Measurement Protocol)</h2>
          <SecretField name="ga4_api_secret" label="API secret do GA4" configured={has('ga4_api_secret')} />
        </section>

        <section className="card space-y-4 p-4">
          <h2 className="font-title text-2xl">Google Ads (conversão offline, opcional)</h2>
          <p className="text-sm text-ink/70">Só envia Purchase de pedidos que vieram de anúncio (com gclid). Exige token de desenvolvedor e credenciais OAuth.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <SecretField name="ads_customer_id" label="ID da conta (customer id)" configured={has('ads_customer_id')} />
            <SecretField name="ads_login_customer_id" label="ID da conta gerente (opcional)" configured={has('ads_login_customer_id')} />
            <SecretField name="ads_conversion_action" label="ID da ação de conversão" configured={has('ads_conversion_action')} />
            <SecretField name="ads_developer_token" label="Developer token" configured={has('ads_developer_token')} />
            <SecretField name="ads_client_id" label="OAuth client id" configured={has('ads_client_id')} />
            <SecretField name="ads_client_secret" label="OAuth client secret" configured={has('ads_client_secret')} />
            <SecretField name="ads_refresh_token" label="OAuth refresh token" configured={has('ads_refresh_token')} />
          </div>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="font-title text-2xl">Opções</h2>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="send_pii" defaultChecked={secrets?.send_pii ?? true} className="mt-1" />
            <span>Enviar dados do cliente (nome, telefone, e-mail, cidade) com hash às plataformas. Melhora a correspondência das conversões. Desmarque para enviar só o valor do pedido.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="dry_run" defaultChecked={secrets?.dry_run ?? false} className="mt-1" />
            <span>Modo de teste: registra o que seria enviado, sem enviar nada às plataformas.</span>
          </label>
          <p className="text-xs text-ink/60">Dica: em qualquer campo de credencial, digite “-” para apagar o valor salvo.</p>
        </section>
      </ActionForm>

      <section className="card p-4">
        <h2 className="font-title text-2xl">Últimos envios</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/70">
              <tr><th className="p-2">Quando</th><th className="p-2">Plataforma</th><th className="p-2">Evento</th><th className="p-2">Resultado</th><th className="p-2">Pedido</th></tr>
            </thead>
            <tbody>
              {(events ?? []).map((e) => (
                <tr key={e.id} className="border-b border-ink/5 align-top">
                  <td className="p-2 whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                  <td className="p-2">{e.platform}</td>
                  <td className="p-2">{e.event_name}</td>
                  <td className="p-2">
                    <span className={e.status === 'failed' ? 'font-semibold text-red-700' : e.status === 'sent' ? 'text-secondary' : 'text-ink/70'}>{e.status}</span>
                    <span className="block text-xs text-ink/60">{e.detail}</span>
                  </td>
                  <td className="p-2">{e.order_id && <Link className="underline" href={`/admin/pedidos/${e.order_id}`}>abrir</Link>}</td>
                </tr>
              ))}
              {!events?.length && <tr><td colSpan={5} className="p-6 text-center text-ink/60">Nenhum envio ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
