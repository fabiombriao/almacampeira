import Link from 'next/link'
import { EMPTY_DRAFT, ProductForm } from '@/components/admin/product-form'
import { requireAdmin } from '@/lib/admin/auth'

// Painel autenticado: fora da validação de navegação instantânea (ver app/admin/layout.tsx)
export const instant = false

export const metadata = { title: 'Novo produto' }

export default async function NovoProdutoPage() {
  const { supabase } = await requireAdmin()
  const { data: categories } = await supabase.from('categories').select('id, name').order('sort_order').order('name')
  return (
    <div className="space-y-4">
      <Link href="/admin/produtos" className="text-sm underline">← Produtos</Link>
      <h1 className="font-title text-4xl uppercase">Novo produto</h1>
      <ProductForm initial={EMPTY_DRAFT} categories={categories ?? []} />
    </div>
  )
}
