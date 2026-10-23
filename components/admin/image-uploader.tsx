'use client'

import { useRef, useState } from 'react'
import { uploadImage } from '@/lib/admin/upload'

function Thumb({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-20 w-20 rounded border border-ink/20 bg-dark/10 object-cover" />
}

/** Uma imagem só, enviada pelo navegador; o URL vai num <input hidden name={name}> do formulário. */
export function SingleImageInput({ name, initial, folder, label }: { name: string; initial?: string | null; folder: string; label: string }) {
  const [url, setUrl] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function onPick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setUrl(await uploadImage(file, folder))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no envio.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        {url ? <Thumb src={url} /> : <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-ink/30 text-xs text-ink/50">sem imagem</div>}
        <div className="space-y-1">
          <button type="button" className="btn btn-outline px-3 py-1.5 text-sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Enviando…' : url ? 'Trocar imagem' : 'Enviar imagem'}
          </button>
          {url && (
            <button type="button" className="ml-2 text-sm underline" onClick={() => setUrl('')}>
              Remover
            </button>
          )}
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
    </div>
  )
}

/** Lista de imagens do produto (a primeira é a capa). Controlado pelo formulário do produto. */
export function ImageListEditor({ value, onChange, folder }: { value: string[]; onChange: (next: string[]) => void; folder: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function onPick(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 10)) urls.push(await uploadImage(file, folder))
      onChange([...value, ...urls].slice(0, 10))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no envio.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  function move(index: number, delta: number) {
    const next = [...value]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div>
      <span className="label">Imagens (a primeira é a capa)</span>
      <ul className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <li key={url + i} className="space-y-1">
            <Thumb src={url} />
            <div className="flex justify-between text-xs">
              <button type="button" onClick={() => move(i, -1)} aria-label="Mover para a esquerda" disabled={i === 0}>←</button>
              <button type="button" className="underline" onClick={() => onChange(value.filter((_, j) => j !== i))}>remover</button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Mover para a direita" disabled={i === value.length - 1}>→</button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-outline mt-3 px-3 py-1.5 text-sm" disabled={busy || value.length >= 10} onClick={() => input.current?.click()}>
        {busy ? 'Enviando…' : 'Adicionar imagens'}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      <input ref={input} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />
    </div>
  )
}
