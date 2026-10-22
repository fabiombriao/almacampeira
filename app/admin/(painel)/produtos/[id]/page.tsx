import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ProductForm, type ProductDraft } from '@/components/admin/product-form'
import { ActionForm } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import type { ProductFull } from '@/lib/types'
import { deleteProductAction } from '../actions'

// Painel autenticado: fora da validação de navegação instantânea (ver app/admin/layout.tsx)
export const instant = false

export const metadata = { title: 'Editar produto' }

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const { supabase } = await requireAdmin()

  const [{ data }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*, images:product_images(url, sort_order), variants:product_variants(*)').eq('id', id).maybeSingle(),
    supabase.from('categories').select('id, name').order('sort_order').order('name'),
  ])
  if (!data) notFound()
  const p = data as unknown as ProductFull

  const initial: ProductDraft = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category_id: p.category_id ?? '',
    description: p.description,
    base_price: String(p.base_price).replace('.', ','),
    promo_price: p.promo_price != null ? String(p.promo_price).replace('.', ',') : '',
    featured: p.featured,
    active: p.active,
    option_names: p.option_names.join(', '),
    allows_personalization: p.allows_personalization,
    personalization_label: p.personalization_label,
    personalization_required: p.personalization_required,
    personalization_max_length: String(p.personalization_max_length),
    personalization_fee: String(p.personalization_fee).replace('.', ','),
    images: [...p.images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url),
    variants: [...p.variants]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        id: v.id,
        sku: v.sku ?? '',
        options: v.option_values ?? {},
        price: v.price != null ? String(v.price).replace('.', ',') : '',
        stock: String(v.stock_quantity),
        active: v.active,
      })),
  }

  async function afterDelete(prev: Parameters<typeof deleteProductAction>[0], form: FormData) {
    'use server'
    const result = await deleteProductAction(prev, form)
    if (result?.ok) redirect('/admin/produtos')
    return result
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/produtos" className="text-sm underline">← Produtos</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-title text-4xl uppercase">Editar produto</h1>
        <Link href={`/produto/${p.slug}`} target="_blank" className="text-sm underline">Ver na loja ↗</Link>
      </div>
      <ProductForm initial={initial} categories={categories ?? []} />
      <section className="card border-red-200 p-4">
        <h2 className="font-title text-2xl">Excluir produto</h2>
        <p className="mb-3 text-sm text-ink/70">Os pedidos antigos continuam guardados com nome e preço da época. Para só esconder da loja, desmarque &quot;Visível na loja&quot;.</p>
        <ActionForm action={afterDelete} submitLabel="Excluir produto" danger confirmMessage="Excluir este produto definitivamente?" className="inline-flex items-center gap-3">
          <input type="hidden" name="id" value={p.id} />
        </ActionForm>
      </section>
    </div>
  )
}
