import { ActionForm } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import type { Category } from '@/lib/types'
import { deleteCategoryAction, saveCategoryAction } from './actions'

export const metadata = { title: 'Categorias' }

export default async function CategoriasPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('categories').select('*').order('sort_order').order('name')
  const categories = (data ?? []) as Category[]

  return (
    <div className="space-y-6">
      <h1 className="font-title text-4xl uppercase">Categorias</h1>

      <section className="card p-4">
        <h2 className="font-title text-2xl">Nova categoria</h2>
        <ActionForm action={saveCategoryAction} submitLabel="Criar categoria" className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="new-name">Nome</label>
            <input id="new-name" name="name" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="new-order">Ordem</label>
            <input id="new-order" name="sort_order" className="input w-24" inputMode="numeric" defaultValue={categories.length + 1} />
          </div>
          <input type="hidden" name="active" value="true" />
        </ActionForm>
      </section>

      <ul className="space-y-3">
        {categories.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-end justify-between gap-3 p-4">
            <ActionForm action={saveCategoryAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={c.id} />
              <div>
                <label className="label">Nome</label>
                <input name="name" className="input" defaultValue={c.name} required />
              </div>
              <div>
                <label className="label">Endereço (slug)</label>
                <input name="slug" className="input" defaultValue={c.slug} />
              </div>
              <div>
                <label className="label">Ordem</label>
                <input name="sort_order" className="input w-24" inputMode="numeric" defaultValue={c.sort_order} />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={c.active} /> Visível
              </label>
            </ActionForm>
            <ActionForm action={deleteCategoryAction} submitLabel="Excluir" danger confirmMessage={`Excluir a categoria "${c.name}"?`} className="inline-flex">
              <input type="hidden" name="id" value={c.id} />
            </ActionForm>
          </li>
        ))}
      </ul>
    </div>
  )
}
