import Image from 'next/image'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { brl } from '@/lib/format'
import { removeDemoProductsAction } from './actions'

export const metadata = { title: 'Produtos' }

type Row = {
  id: string
  name: string
  slug: string
  base_price: number
  promo_price: number | null
  active: boolean
  is_demo: boolean
  category: { name: string } | null
  images: { url: string; sort_order: number }[]
  variants: { stock_quantity: number; active: boolean }[]
}

export default async function ProdutosAdminPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('products')
    .select('id, name, slug, base_price, promo_price, active, is_demo, category:categories(name), images:product_images(url, sort_order), variants:product_variants(stock_quantity, active)')
    .order('created_at', { ascending: false })
  const products = (data ?? []) as unknown as Row[]
  const hasDemo = products.some((p) => p.is_demo)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-title text-4xl uppercase">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn btn-primary">+ Novo produto</Link>
      </div>

      {hasDemo && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-accent bg-accent/15 p-4 text-sm">
          <p>Há produtos de <strong>exemplo</strong> na loja. Remova quando for cadastrar os produtos reais.</p>
          <ActionForm action={removeDemoProductsAction} submitLabel="Remover itens de exemplo" danger confirmMessage="Remover todos os produtos de exemplo?" className="inline-flex items-center gap-3" />
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink/70">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3">Categoria</th>
              <th className="p-3 text-right">Preço</th>
              <th className="p-3 text-right">Estoque</th>
              <th className="p-3">Situação</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const cover = [...p.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url
              const stock = p.variants.filter((v) => v.active).reduce((n, v) => n + v.stock_quantity, 0)
              return (
                <tr key={p.id} className="border-b border-ink/5">
                  <td className="p-3">
                    <Link href={`/admin/produtos/${p.id}`} className="flex items-center gap-3 hover:text-primary">
                      {cover ? <Image src={cover} alt="" width={44} height={44} unoptimized={cover.endsWith('.svg')} className="h-11 w-11 rounded object-cover" /> : <span className="h-11 w-11 rounded bg-dark/10" />}
                      <span>
                        {p.name}
                        {p.is_demo && <span className="ml-2 rounded bg-accent/40 px-1.5 text-xs">exemplo</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="p-3">{p.category?.name ?? '—'}</td>
                  <td className="p-3 text-right">{brl(p.promo_price ?? p.base_price)}</td>
                  <td className={`p-3 text-right ${stock === 0 ? 'font-bold text-red-700' : ''}`}>{stock}</td>
                  <td className="p-3">{p.active ? 'Visível' : 'Oculto'}</td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/produtos/${p.id}`} className="underline">Editar</Link>
                  </td>
                </tr>
              )
            })}
            {!products.length && (
              <tr><td colSpan={6} className="p-8 text-center text-ink/60">Nenhum produto cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
