/**
 * Evento enviado à Meta quando alguém clica no link do bazar e é levado ao grupo.
 * É o evento PADRÃO "Lead": aparece direto na lista de conversão das campanhas. Um evento personalizado
 * enviado só pelo servidor demora a ser listado pela Meta e exigiria uma conversão personalizada.
 */
export const GROUP_EVENT_NAME = 'Lead'

/** O destino do /bazar só pode ser WhatsApp (https), para o redirecionamento não virar um "redirect aberto". */
export function isAllowedGroupUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    return url.hostname === 'chat.whatsapp.com' || url.hostname === 'whatsapp.com' || url.hostname === 'www.whatsapp.com' || url.hostname === 'wa.me'
  } catch {
    return false
  }
}

/**
 * Robôs de pré-visualização de link (WhatsApp, Facebook, Google...) acessam o endereço sem haver clique de pessoa.
 * Esses acessos redirecionam, mas não contam como evento.
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true
  // "bot/" e "bot;" pegam Googlebot/2.1, bingbot/2.0 etc. sem pegar aparelhos como "Cubot"
  return /bot[/;)]|\bbot\b|crawler|spider|facebookexternalhit|facebookcatalog|meta-externalagent|meta-externalfetcher|whatsapp|preview|headless|curl|wget/i.test(userAgent)
}

/** Parâmetro fbc da Meta, montado a partir do fbclid quando o cookie _fbc ainda não existe. */
export function fbcFromClickId(fbclid: string | null | undefined, nowMs: number): string | undefined {
  const id = (fbclid ?? '').trim()
  return id ? `fb.1.${nowMs}.${id}` : undefined
}
