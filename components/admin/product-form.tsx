'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveProductAction } from '@/app/admin/(painel)/produtos/actions'
import { ImageListEditor } from '@/components/admin/image-uploader'
import { money } from '@/lib/admin/common'
import { slugify } from '@/lib/format'

export type VariantDraft = { id?: string; sku: string; options: Record<string, string>; price: string; stock: string; active: boolean; images: string[] }
export type ProductDraft = {
  id?: string
  name: string
  slug: string
  category_id: string
  description: string
  base_price: string
  promo_price: string
  featured: boolean
  active: boolean
  option_names: string
  allows_personalization: boolean
  personalization_label: string
  personalization_required: boolean
  personalization_max_length: string
  personalization_fee: string
  images: string[]
  variants: VariantDraft[]
}

export const EMPTY_DRAFT: ProductDraft = {
  name: '',
  slug: '',
  category_id: '',
  description: '',
  base_price: '',
  promo_price: '',
  featured: false,
  active: true,
  option_names: '',
  allows_personalization: false,
  personalization_label: 'Texto para personalizar',
  personalization_required: false,
  personalization_max_length: '40',
  personalization_fee: '0',
  images: [],
  variants: [{ sku: '', options: {}, price: '', stock: '0', active: true, images: [] }],
}

export function ProductForm({ initial, categories }: { initial: ProductDraft; categories: { id: string; name: string }[] }) {
  const router = useRouter()
  const [d, setD] = useState<ProductDraft>(initial)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setD((prev) => ({ ...prev, [key]: value }))

  const optionNames = d.option_names.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3)

  function setVariant(index: number, patch: Partial<VariantDraft>) {
    set('variants', d.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)
    const base = money(d.base_price)
    if (base == null) return setMessage({ ok: false, text: 'Informe o preço normal.' })
    start(async () => {
      const result = await saveProductAction({
        id: d.id,
        name: d.name,
        slug: d.slug || slugify(d.name),
        category_id: d.category_id || null,
        description: d.description,
        base_price: base,
        promo_price: money(d.promo_price),
        featured: d.featured,
        active: d.active,
        option_names: optionNames,
        allows_personalization: d.allows_personalization,
        personalization_label: d.personalization_label || 'Texto para personalizar',
        personalization_required: d.personalization_required,
        personalization_max_length: Number.parseInt(d.personalization_max_length, 10) || 40,
        personalization_fee: money(d.personalization_fee) ?? 0,
        images: d.images,
        variants: d.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          options: v.options,
          price: money(v.price),
          stock: Number.parseInt(v.stock, 10) || 0,
          active: v.active,
          images: v.images.filter((url) => d.images.includes(url)),
        })),
      })
      setMessage({ ok: result.ok, text: result.message })
      if (result.ok) {
        router.push('/admin/produtos')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card space-y-4 p-4">
        <h2 className="font-title text-2xl">Dados do produto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-name">Nome *</label>
            <input id="p-name" className="input" required value={d.name} onChange={(e) => set('name', e.target.value)} onBlur={() => !d.id && !d.slug && set('slug', slugify(d.name))} />
          </div>
          <div>
            <label className="label" htmlFor="p-slug">Endereço (slug)</label>
            <input id="p-slug" className="input" value={d.slug} onChange={(e) => set('slug', e.target.value)} placeholder="gerado a partir do nome" />
          </div>
          <div>
            <label className="label" htmlFor="p-cat">Categoria</label>
            <select id="p-cat" className="input" value={d.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="p-price">Preço (R$) *</label>
              <input id="p-price" className="input" inputMode="decimal" required value={d.base_price} onChange={(e) => set('base_price', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="p-promo">Preço promocional</label>
              <input id="p-promo" className="input" inputMode="decimal" value={d.promo_price} onChange={(e) => set('promo_price', e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="p-desc">Descrição</label>
          <textarea id="p-desc" className="input" rows={4} value={d.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={d.active} onChange={(e) => set('active', e.target.checked)} /> Visível na loja</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={d.featured} onChange={(e) => set('featured', e.target.checked)} /> Destaque na página inicial</label>
        </div>
        <ImageListEditor value={d.images} onChange={(images) => set('images', images)} folder="produtos" />
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="font-title text-2xl">Variações e estoque</h2>
        <div>
          <label className="label" htmlFor="p-opts">Opções do produto (separe por vírgula)</label>
          <input id="p-opts" className="input" value={d.option_names} onChange={(e) => set('option_names', e.target.value)} placeholder="Ex.: Tamanho, Cor. Deixe vazio se o produto não tem variações." />
        </div>
        <div className="space-y-3">
          {d.variants.map((v, i) => (
            <div key={v.id ?? i} className="grid items-end gap-3 rounded border border-ink/15 p-3 sm:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]">
              {optionNames.map((name) => (
                <div key={name}>
                  <label className="label">{name}</label>
                  <input className="input" required value={v.options[name] ?? ''} onChange={(e) => setVariant(i, { options: { ...v.options, [name]: e.target.value } })} />
                </div>
              ))}
              <div>
                <label className="label">Código (SKU)</label>
                <input className="input" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} />
              </div>
              <div>
                <label className="label">Preço desta variação</label>
                <input className="input" inputMode="decimal" value={v.price} placeholder="igual ao produto" onChange={(e) => setVariant(i, { price: e.target.value })} />
              </div>
              <div>
                <label className="label">Estoque</label>
                <input className="input" inputMode="numeric" required value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={v.active} onChange={(e) => setVariant(i, { active: e.target.checked })} /> Ativa</label>
              {d.variants.length > 1 && (
                <button type="button" className="pb-2 text-left text-sm text-red-700 underline" onClick={() => set('variants', d.variants.filter((_, j) => j !== i))}>
                  Remover
                </button>
              )}
              {d.images.length > 0 && (
                <div className="sm:col-span-full">
                  <span className="label">Fotos desta variação (clique para ligar ou desligar)</span>
                  <ul className="flex flex-wrap gap-2">
                    {d.images.map((url, n) => {
                      const on = v.images.includes(url)
                      return (
                        <li key={url + n}>
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-label={`Foto ${n + 1}${on ? ' (ligada a esta variação)' : ''}`}
                            onClick={() => setVariant(i, { images: on ? v.images.filter((u) => u !== url) : [...v.images, url] })}
                            className={`relative block h-14 w-14 overflow-hidden rounded border-2 ${on ? 'border-primary' : 'border-transparent opacity-60'}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            {on && <span className="absolute right-0 top-0 bg-primary px-1 text-xs text-white">✓</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
        {optionNames.length > 0 && (
          <button type="button" className="btn btn-outline px-4 py-1.5 text-sm" onClick={() => set('variants', [...d.variants, { sku: '', options: {}, price: '', stock: '0', active: true, images: [] }])}>
            + Adicionar variação
          </button>
        )}
        <p className="text-xs text-ink/60">Sem opções, o produto tem uma única linha de estoque. O preço da variação, quando preenchido, vale no lugar do preço do produto (e da promoção).</p>
        <p className="text-xs text-ink/60">Fotos: envie todas na galeria do produto (acima) e ligue a cada variação as que são dela. Uma ou várias. Na loja, escolher a variação mostra a foto dela, e clicar numa foto seleciona a variação.</p>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="font-title text-2xl">Personalização</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={d.allows_personalization} onChange={(e) => set('allows_personalization', e.target.checked)} />
          Este produto aceita personalização (gravação de nome, texto etc.)
        </label>
        {d.allows_personalization && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Texto do campo para o cliente</label>
              <input className="input" value={d.personalization_label} onChange={(e) => set('personalization_label', e.target.value)} />
            </div>
            <div>
              <label className="label">Limite de caracteres</label>
              <input className="input" inputMode="numeric" value={d.personalization_max_length} onChange={(e) => set('personalization_max_length', e.target.value)} />
            </div>
            <div>
              <label className="label">Valor extra por unidade personalizada (R$)</label>
              <input className="input" inputMode="decimal" value={d.personalization_fee} onChange={(e) => set('personalization_fee', e.target.value)} />
              <p className="mt-1 text-xs text-ink/60">0 = sem custo. A taxa só é somada quando o cliente preenche o texto.</p>
            </div>
            <label className="flex items-center gap-2 self-center text-sm">
              <input type="checkbox" checked={d.personalization_required} onChange={(e) => set('personalization_required', e.target.checked)} />
              Personalização obrigatória
            </label>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? 'Salvando…' : 'Salvar produto'}</button>
        {message && <p role="status" className={`text-sm ${message.ok ? 'text-secondary' : 'text-red-700'}`}>{message.text}</p>}
      </div>
    </form>
  )
}
