export type ActionState = { ok: boolean; message: string } | null

export const ok = (message: string): ActionState => ({ ok: true, message })
export const fail = (message: string): ActionState => ({ ok: false, message })

export function str(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim()
}

export function bool(form: FormData, name: string): boolean {
  return form.get(name) === 'on' || form.get(name) === 'true'
}

/** Aceita "12,50", "12.50" e "1.234,56". */
export function money(value: string | null | undefined): number | null {
  if (value == null || value.trim() === '') return null
  const normalized = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export function int(value: string | null | undefined, fallback = 0): number {
  const n = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

export function dbMessage(error: { message: string; code?: string }): string {
  if (error.code === '23505') return 'Já existe um registro com esse valor (código ou endereço repetido).'
  if (error.code === '42501') return 'Sem permissão para esta ação.'
  return error.message
}
