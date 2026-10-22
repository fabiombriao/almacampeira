'use server'

import { updateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { bool, dbMessage, fail, ok, str, type ActionState } from '@/lib/admin/common'
import { serviceClient } from '@/lib/supabase/admin'

export async function savePublicIdsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const pixel = str(form, 'meta_pixel_id')
  const ga4 = str(form, 'ga4_measurement_id')
  if (pixel && !/^\d{5,20}$/.test(pixel)) return fail('O ID do Pixel da Meta tem só números (5 a 20 dígitos).')
  if (ga4 && !/^[A-Za-z0-9_-]{4,30}$/.test(ga4)) return fail('ID de medição do GA4 inválido (ex.: G-XXXXXXXXXX).')
  const { error } = await supabase.from('store_settings').update({ meta_pixel_id: pixel || null, ga4_measurement_id: ga4 || null }).eq('id', 1)
  if (error) return fail(dbMessage(error))
  updateTag('settings')
  return ok('IDs salvos. As tags passam a carregar na loja.')
}

const SECRET_FIELDS = [
  'meta_capi_token',
  'meta_test_event_code',
  'ga4_api_secret',
  'ads_customer_id',
  'ads_login_customer_id',
  'ads_conversion_action',
  'ads_developer_token',
  'ads_client_id',
  'ads_client_secret',
  'ads_refresh_token',
] as const

/** Campo em branco = mantém o valor atual. "-" = apaga. Os segredos nunca voltam ao navegador. */
export async function saveSecretsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin()
  const patch: Record<string, string | boolean | null> = { send_pii: bool(form, 'send_pii'), dry_run: bool(form, 'dry_run') }
  for (const field of SECRET_FIELDS) {
    const value = str(form, field)
    if (value === '-') patch[field] = null
    else if (value) patch[field] = value
  }
  const { error } = await serviceClient().from('integration_secrets').update(patch).eq('id', 1)
  if (error) return fail(dbMessage(error))
  return ok('Credenciais e opções salvas.')
}
