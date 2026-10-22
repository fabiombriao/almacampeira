import { SingleImageInput } from '@/components/admin/image-uploader'
import { ActionForm } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { DEFAULT_THEME, THEME_FIELDS } from '@/lib/theme'
import type { Banner, StoreSettings } from '@/lib/types'
import { deleteBannerAction, resetThemeAction, saveBannerAction, saveThemeAction } from './actions'

// Painel autenticado: fora da validação de navegação instantânea (ver app/admin/layout.tsx)
export const instant = false

export const metadata = { title: 'Aparência' }

function BannerFields({ b }: { b?: Banner }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {b && <input type="hidden" name="id" value={b.id} />}
      <div className="sm:col-span-2">
        <SingleImageInput name="image_url" initial={b?.image_url} folder="banners" label="Imagem do banner (ideal: 1600×600)" />
      </div>
      <div>
        <label className="label">Título</label>
        <input name="title" className="input" defaultValue={b?.title ?? ''} />
      </div>
      <div>
        <label className="label">Subtítulo</label>
        <input name="subtitle" className="input" defaultValue={b?.subtitle ?? ''} />
      </div>
      <div>
        <label className="label">Link do botão (ex.: /categoria/chimarrao)</label>
        <input name="link_url" className="input" defaultValue={b?.link_url ?? ''} />
      </div>
      <div className="flex items-end gap-4">
        <div>
          <label className="label">Ordem</label>
          <input name="sort_order" className="input w-24" inputMode="numeric" defaultValue={b?.sort_order ?? 0} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={b?.active ?? true} /> Ativo
        </label>
      </div>
    </div>
  )
}

export default async function AparenciaPage() {
  const { supabase } = await requireAdmin()
  const [{ data: settings }, { data: banners }] = await Promise.all([
    supabase.from('store_settings').select('theme, logo_url').eq('id', 1).single(),
    supabase.from('banners').select('*').order('sort_order'),
  ])
  const s = settings as Pick<StoreSettings, 'theme' | 'logo_url'>
  const theme = { ...DEFAULT_THEME, ...s.theme }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-title text-4xl uppercase">Aparência</h1>

      <section className="card space-y-4 p-4">
        <h2 className="font-title text-2xl">Cores e logo</h2>
        <ActionForm action={saveThemeAction} submitLabel="Salvar aparência" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {THEME_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="label" htmlFor={`c-${key}`}>{label}</label>
                <input id={`c-${key}`} name={key} type="color" defaultValue={theme[key]} className="h-10 w-24 cursor-pointer rounded border border-ink/30 bg-white p-1" />
              </div>
            ))}
          </div>
          <SingleImageInput name="logo_url" initial={s.logo_url} folder="logo" label="Logo (aparece no topo, no rodapé e ao compartilhar o link)" />
        </ActionForm>
        <ActionForm action={resetThemeAction} submitLabel="Restaurar cores da marca" confirmMessage="Voltar às cores originais da Alma Campeira?" className="inline-flex" />
      </section>

      <section className="space-y-4">
        <h2 className="font-title text-2xl">Banners da página inicial</h2>
        <p className="text-sm text-ink/70">Sem banners, a home mostra o destaque padrão com o logo. Com banners, eles viram um carrossel no topo.</p>
        <div className="card p-4">
          <h3 className="mb-3 font-semibold">Novo banner</h3>
          <ActionForm action={saveBannerAction} submitLabel="Criar banner" className="space-y-4">
            <BannerFields />
          </ActionForm>
        </div>
        {((banners ?? []) as Banner[]).map((b) => (
          <div key={b.id} className="card space-y-3 p-4">
            <ActionForm action={saveBannerAction} className="space-y-4">
              <BannerFields b={b} />
            </ActionForm>
            <ActionForm action={deleteBannerAction} submitLabel="Excluir banner" danger confirmMessage="Excluir este banner?" className="inline-flex">
              <input type="hidden" name="id" value={b.id} />
            </ActionForm>
          </div>
        ))}
      </section>
    </div>
  )
}
