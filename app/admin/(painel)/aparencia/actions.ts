'use server'

import { updateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { bool, dbMessage, fail, int, ok, str, type ActionState } from '@/lib/admin/common'
import { DEFAULT_THEME, THEME_FIELDS } from '@/lib/theme'

const HEX = /^#[0-9a-fA-F]{6}$/

export async function saveThemeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const theme: Record<string, string> = {}
  for (const { key } of THEME_FIELDS) {
    const value = str(form, key)
    if (!HEX.test(value)) return fail('Cores inválidas. Use o seletor de cor.')
    theme[key] = value.toUpperCase()
  }
  const logo = str(form, 'logo_url') || '/logo.jpg'
  const { error } = await supabase.from('store_settings').update({ theme, logo_url: logo }).eq('id', 1)
  if (error) return fail(dbMessage(error))
  updateTag('settings')
  return ok('Aparência salva.')
}

export async function resetThemeAction(): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('store_settings').update({ theme: DEFAULT_THEME }).eq('id', 1)
  if (error) return fail(dbMessage(error))
  updateTag('settings')
  return ok('Cores restauradas para o padrão da marca.')
}

export async function saveBannerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const id = str(form, 'id')
  const image = str(form, 'image_url')
  if (!image) return fail('Envie a imagem do banner.')
  const link = str(form, 'link_url')
  if (link && !/^(\/|https?:\/\/)/.test(link)) return fail('O link deve começar com / ou https://')
  const row = {
    image_url: image,
    title: str(form, 'title') || null,
    subtitle: str(form, 'subtitle') || null,
    link_url: link || null,
    sort_order: int(str(form, 'sort_order')),
    active: bool(form, 'active'),
  }
  const { error } = id ? await supabase.from('banners').update(row).eq('id', id) : await supabase.from('banners').insert(row)
  if (error) return fail(dbMessage(error))
  updateTag('banners')
  return ok(id ? 'Banner salvo.' : 'Banner criado.')
}

export async function deleteBannerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('banners').delete().eq('id', str(form, 'id'))
  if (error) return fail(dbMessage(error))
  updateTag('banners')
  return ok('Banner excluído.')
}
