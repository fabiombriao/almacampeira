'use client'

import { useSyncExternalStore } from 'react'

export type CartLine = {
  key: string
  variantId: string
  productId: string
  slug: string
  name: string
  variantLabel: string | null
  image: string | null
  unitPrice: number
  personalizationText: string | null
  personalizationFee: number
  quantity: number
  maxStock: number
}

const STORAGE_KEY = 'ac_cart_v1'
const EMPTY: CartLine[] = []

let state: CartLine[] = EMPTY
let loaded = false
const listeners = new Set<() => void>()

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    state = Array.isArray(parsed) ? parsed : EMPTY
  } catch {
    state = EMPTY
  }
}

function emit() {
  for (const l of listeners) l()
}

function persist(next: CartLine[]) {
  state = next.length ? next : EMPTY
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // modo privado / storage cheio: o carrinho segue só em memória
  }
  emit()
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY) {
    load()
    emit()
  }
}

function subscribe(listener: () => void) {
  if (!loaded) {
    loaded = true
    load()
  }
  if (listeners.size === 0) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY)
}

export function addToCart(line: CartLine) {
  const existing = state.find((l) => l.key === line.key)
  if (existing) {
    const quantity = Math.min(existing.quantity + line.quantity, Math.max(line.maxStock, 1), 99)
    persist(state.map((l) => (l.key === line.key ? { ...l, quantity, unitPrice: line.unitPrice, maxStock: line.maxStock } : l)))
  } else {
    persist([...state, { ...line, quantity: Math.min(line.quantity, Math.max(line.maxStock, 1), 99) }])
  }
}

export function setLineQuantity(key: string, quantity: number) {
  if (quantity < 1) return removeLine(key)
  persist(state.map((l) => (l.key === key ? { ...l, quantity: Math.min(quantity, 99) } : l)))
}

export function removeLine(key: string) {
  persist(state.filter((l) => l.key !== key))
}

export function clearCart() {
  persist([])
}

export function replaceLines(lines: CartLine[]) {
  persist(lines)
}

export const lineTotal = (l: CartLine) => (l.unitPrice + l.personalizationFee) * l.quantity
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + lineTotal(l), 0)
export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0)
