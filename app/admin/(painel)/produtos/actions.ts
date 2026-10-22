'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/auth'
import { dbMessage, fail, ok, str, type ActionState } from '@/lib/admin/common'
import { slugify } from '@/lib/format'

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().max(40),
  options: z.record(z.string().max(40), z.string().trim().max(60)),
  price: z.number().min(0).max(1_000_000).nullable(),
  stock: z.number().int().min(0).max(1_000_000),
  active: z.boolean(),
})

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Informe o nome do produto').max(120),
  slug: z.string().trim().max(80),
  category_id: z.string().uuid().nullable(),
  description: z.string().max(4000),
  base_price: z.number().min(0, 'Informe o preço').max(1_000_000),
  promo_price: z.number().min(0).max(1_000_000).nullable(),
  featured: z.boolean(),
  active: z.boolean(),
  option_names: z.array(z.string().trim().min(1).max(40)).max(3),
  allows_personalization: z.boolean(),
  personalization_label: z.string().trim().min(1).max(80),
  personalization_required: z.boolean(),
  personalization_max_length: z.number().int().min(1).max(200),
  personalization_fee: z.number().min(0).max(100_000),
  images: z.array(z.string().url().max(600)).max(10),
  variants: z.array(variantSchema).min(1, 'Cadastre ao menos uma variação').max(100),
})

export type SaveProductResult = { ok: boolean; message: string; id?: string }

export async function saveProductAction(input: unknown): Promise<SaveProductResult> {
  const { supabase } = await requireAdmin()
  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  const p = parsed.data
  if (p.promo_price != null && p.promo_price >= p.base_price) return { ok: false, message: 'O preço promocional precisa ser menor que o preço normal.' }

  const row = {
    name: p.name,
    slug: slugify(p.slug || p.name) || 'produto',
    category_id: p.category_id,
    description: p.description,
    base_price: p.base_price,
    promo_price: p.promo_price,
    option_names: p.option_names,
    featured: p.featured,
    active: p.active,
    allows_personalization: p.allows_personalization,
    personalization_label: p.personalization_label,
    personalization_required: p.allows_personalization && p.personalization_required,
    personalization_max_length: p.personalization_max_length,
    personalization_fee: p.personalization_fee,
  }

  let productId = p.id
  if (productId) {
    const { error } = await supabase.from('products').update(row).eq('id', productId)
    if (error) return { ok: false, message: dbMessage(error) }
  } else {
    const { data, error } = await supabase.from('products').insert(row).select('id').single()
    if (error) return { ok: false, message: dbMessage(error) }
    productId = data.id as string
  }

  // variações: remove as que saíram, atualiza as existentes, cria as novas
  const { data: existing } = await supabase.from('product_variants').select('id').eq('product_id', productId)
  const keep = new Set(p.variants.map((v) => v.id).filter(Boolean))
  const toDelete = (existing ?? []).map((v) => v.id as string).filter((id) => !keep.has(id))
  if (toDelete.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', toDelete)
    if (error) return { ok: false, message: dbMessage(error) }
  }
  for (const [index, v] of p.variants.entries()) {
    const variantRow = {
      product_id: productId,
      sku: v.sku || null,
      option_values: Object.fromEntries(Object.entries(v.options).filter(([k, val]) => p.option_names.includes(k) && val)),
      price: v.price,
      stock_quantity: v.stock,
      active: v.active,
      sort_order: index,
    }
    const { error } = v.id
      ? await supabase.from('product_variants').update(variantRow).eq('id', v.id)
      : await supabase.from('product_variants').insert(variantRow)
    if (error) return { ok: false, message: dbMessage(error) }
  }

  // imagens: substitui o conjunto
  await supabase.from('product_images').delete().eq('product_id', productId)
  if (p.images.length) {
    const { error } = await supabase.from('product_images').insert(p.images.map((url, sort_order) => ({ product_id: productId, url, sort_order })))
    if (error) return { ok: false, message: dbMessage(error) }
  }

  updateTag('products')
  return { ok: true, message: 'Produto salvo.', id: productId }
}

export async function deleteProductAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const id = str(form, 'id')
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return fail(dbMessage(error))
  updateTag('products')
  return ok('Produto excluído.')
}

export async function removeDemoProductsAction(): Promise<ActionState> {
  const { supabase } = await requireAdmin()
  const { error, count } = await supabase.from('products').delete({ count: 'exact' }).eq('is_demo', true)
  if (error) return fail(dbMessage(error))
  updateTag('products')
  return ok(`${count ?? 0} item(ns) de exemplo removido(s).`)
}
