'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { ActionState } from '@/lib/admin/common'

/**
 * Formulário que chama uma server action sem o reset automático do React 19
 * (os campos continuam preenchidos depois de salvar) e mostra o resultado.
 */
export function ActionForm({
  action,
  children,
  submitLabel = 'Salvar',
  className = 'space-y-4',
  confirmMessage,
  danger = false,
  hideSubmit = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  children?: React.ReactNode
  submitLabel?: string
  className?: string
  confirmMessage?: string
  danger?: boolean
  hideSubmit?: boolean
}) {
  const [state, setState] = useState<ActionState>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault()
        if (confirmMessage && !window.confirm(confirmMessage)) return
        const data = new FormData(event.currentTarget)
        start(async () => {
          const result = await action(null, data)
          setState(result)
          if (result?.ok) router.refresh()
        })
      }}
    >
      {children}
      {!hideSubmit && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={pending}>
            {pending ? 'Salvando…' : submitLabel}
          </button>
          {state && (
            <p role="status" className={`text-sm ${state.ok ? 'text-secondary' : 'text-red-700'}`}>
              {state.ok ? '✓ ' : ''}
              {state.message}
            </p>
          )}
        </div>
      )}
    </form>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
    </div>
  )
}
