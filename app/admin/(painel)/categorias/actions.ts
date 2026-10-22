'use server'

import { updateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { bool, dbMessage, fail, int, ok, str, type ActionState } from '@/lib/admin/common'
import { slugify } from '@/lib/format'

export async function saveCategoryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const id = str(form, 'id')
  const name = str(form, 'name')
  if (name.length < 2) return fail('Informe o nome da categoria.')
  const row = { name, slug: slugify(str(form, 'slug') || name), sort_order: int(str(form, 'sort_order')), active: bool(form, 'active') }
  const { error } = id ? await supabase.from('categories').update(row).eq('id', id) : await supabase.from('categories').insert(row)
  if (error) return fail(dbMessage(error))
  updateTag('categories')
  updateTag('products')
  return ok(id ? 'Categoria salva.' : 'Categoria criada.')
}

export async function deleteCategoryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('categories').delete().eq('id', str(form, 'id'))
  if (error) return fail(dbMessage(error))
  updateTag('categories')
  updateTag('products')
  return ok('Categoria excluída. Os produtos dela ficam sem categoria.')
}
