import { describe, expect, it } from 'vitest'
import { fbcFromClickId, isAllowedGroupUrl, isBotUserAgent } from '@/lib/group'

describe('link do grupo (/bazar)', () => {
  it('aceita só https do WhatsApp', () => {
    expect(isAllowedGroupUrl('https://chat.whatsapp.com/CodigoFicticio123?s=cl&p=a')).toBe(true)
    expect(isAllowedGroupUrl('https://wa.me/5551999990000')).toBe(true)
    expect(isAllowedGroupUrl('http://chat.whatsapp.com/abc')).toBe(false)
    expect(isAllowedGroupUrl('https://chat.whatsapp.com.evil.com/abc')).toBe(false)
    expect(isAllowedGroupUrl('https://evil.com/?u=chat.whatsapp.com')).toBe(false)
    expect(isAllowedGroupUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedGroupUrl('')).toBe(false)
  })

  it('reconhece robôs de pré-visualização e ignora pessoas', () => {
    expect(isBotUserAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true)
    expect(isBotUserAgent('WhatsApp/2.23.20 A')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBotUserAgent(null)).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (Linux; Android 11; CUBOT X30) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36')).toBe(false)
    expect(isBotUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0]')).toBe(false)
    expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0')).toBe(false)
  })

  it('monta o fbc a partir do fbclid', () => {
    expect(fbcFromClickId('IwAR123', 1700000000000)).toBe('fb.1.1700000000000.IwAR123')
    expect(fbcFromClickId('', 1)).toBeUndefined()
    expect(fbcFromClickId(null, 1)).toBeUndefined()
  })
})
