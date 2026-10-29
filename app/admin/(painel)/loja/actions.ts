'use server'

import { updateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { dbMessage, fail, ok, str, type ActionState } from '@/lib/admin/common'
import { onlyDigits, toInternationalPhone } from '@/lib/format'
import { isAllowedGroupUrl } from '@/lib/group'

export async function saveStoreAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const phone = toInternationalPhone(str(form, 'whatsapp_number'))
  if (onlyDigits(phone).length < 12 || onlyDigits(phone).length > 13) return fail('WhatsApp inválido. Informe DDD + número (ex.: 51 99999-0000).')
  const template = String(form.get('message_template') ?? '').replace(/\r\n/g, '\n').trim()
  if (!template.includes('{itens}')) return fail('A mensagem precisa conter {itens}, senão o pedido não aparece no WhatsApp.')
  const name = str(form, 'name')
  if (!name) return fail('Informe o nome da loja.')
  const groupUrl = str(form, 'group_url')
  if (groupUrl && !isAllowedGroupUrl(groupUrl)) return fail('O link do grupo precisa ser um endereço https do WhatsApp (ex.: https://chat.whatsapp.com/...).')

  const { error } = await supabase
    .from('store_settings')
    .update({
      name,
      tagline: str(form, 'tagline'),
      whatsapp_number: phone,
      message_template: template,
      business_hours: str(form, 'business_hours'),
      pickup_address: str(form, 'pickup_address'),
      delivery_note: str(form, 'delivery_note'),
      instagram_url: str(form, 'instagram_url'),
      group_url: groupUrl,
      about_text: str(form, 'about_text'),
      privacy_text: String(form.get('privacy_text') ?? '').replace(/\r\n/g, '\n').trim(),
    })
    .eq('id', 1)
  if (error) return fail(dbMessage(error))
  updateTag('settings')
  return ok('Configurações da loja salvas.')
}
