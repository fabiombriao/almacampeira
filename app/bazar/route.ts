import { after, NextResponse, type NextRequest } from 'next/server'
import { getStoreSettings } from '@/lib/data/catalog'
import { fbcFromClickId, isAllowedGroupUrl, isBotUserAgent } from '@/lib/group'
import { dispatchGroupEvent } from '@/lib/tracking/server'

/**
 * Link da campanha do bazar: registra o clique (evento "Lead" na Meta, pelo servidor) e
 * redireciona para o grupo de WhatsApp configurado em Admin > Loja.
 */
export async function GET(request: NextRequest) {
  const { group_url } = await getStoreSettings()
  if (!isAllowedGroupUrl(group_url)) return NextResponse.redirect(new URL('/', request.url), 302)

  const userAgent = request.headers.get('user-agent')
  if (!isBotUserAgent(userAgent)) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined
    const click = {
      ip,
      userAgent: userAgent ?? undefined,
      fbp: request.cookies.get('_fbp')?.value,
      fbc: request.cookies.get('_fbc')?.value ?? fbcFromClickId(request.nextUrl.searchParams.get('fbclid'), Date.now()),
      sourceUrl: request.nextUrl.toString(),
    }
    after(() => dispatchGroupEvent(click))
  }
  return NextResponse.redirect(group_url, 302)
}

// Pré-carregamentos (HEAD) redirecionam sem contar como clique.
export async function HEAD(request: NextRequest) {
  const { group_url } = await getStoreSettings()
  return NextResponse.redirect(isAllowedGroupUrl(group_url) ? group_url : new URL('/', request.url), 302)
}
