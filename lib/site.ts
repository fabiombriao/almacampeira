import 'server-only'
import { headers } from 'next/headers'

/** Origem (https://dominio) do pedido atual, a partir dos headers do proxy da Vercel. */
export async function originFromHeaders(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** URL base do site para metadata, sitemap e OG (sem tocar em nada da Vercel, só lê variáveis de sistema). */
export function siteBaseUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return new URL(explicit ?? (vercel ? `https://${vercel}` : 'http://localhost:3000'))
}
