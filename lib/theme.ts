import type { Theme } from './types'

const HEX = /^#[0-9a-fA-F]{6}$/

const DEFAULTS: Theme = {
  bg_dark: '#1F130D',
  primary: '#8C4A24',
  secondary: '#2E4A3A',
  accent: '#C8A27C',
  bg_light: '#F4ECE1',
  text: '#2A1D16',
}

/** Gera as CSS variables do tema. Só aceita cores hex, para não abrir brecha de injeção de CSS. */
export function themeCss(theme: Partial<Theme> | null | undefined): string {
  const t = { ...DEFAULTS, ...(theme ?? {}) }
  const pick = (value: string, fallback: string) => (HEX.test(value) ? value : fallback)
  return `:root{--c-dark:${pick(t.bg_dark, DEFAULTS.bg_dark)};--c-primary:${pick(t.primary, DEFAULTS.primary)};--c-secondary:${pick(t.secondary, DEFAULTS.secondary)};--c-accent:${pick(t.accent, DEFAULTS.accent)};--c-light:${pick(t.bg_light, DEFAULTS.bg_light)};--c-text:${pick(t.text, DEFAULTS.text)}}`
}

export const THEME_FIELDS: { key: keyof Theme; label: string }[] = [
  { key: 'bg_dark', label: 'Fundo escuro (topo e rodapé)' },
  { key: 'primary', label: 'Cor principal (botões)' },
  { key: 'secondary', label: 'Cor secundária (selos)' },
  { key: 'accent', label: 'Destaque (detalhes dourados)' },
  { key: 'bg_light', label: 'Fundo claro das páginas' },
  { key: 'text', label: 'Texto' },
]

export { DEFAULTS as DEFAULT_THEME }
