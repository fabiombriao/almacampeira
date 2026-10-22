import crypto from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('hash dos dados pessoais para Meta/Google', () => {
  it('normaliza e aplica SHA-256 (e-mail em minúsculas, telefone com 55)', async () => {
    const { hashedUserData } = await import('@/lib/tracking/server')
    const sha = (v: string) => crypto.createHash('sha256').update(v).digest('hex')
    const data = hashedUserData({
      customer_name: 'Maria  Da Silva',
      customer_phone: '(51) 99999-0000',
      customer_email: '  Maria@Example.COM ',
      address: { city: 'São Paulo', state: 'SP', cep: '01000-000' },
    })
    expect(data.em).toEqual([sha('maria@example.com')])
    expect(data.ph).toEqual([sha('5551999990000')])
    expect(data.fn).toEqual([sha('maria')])
    expect(data.ln).toEqual([sha('silva')])
    expect(data.ct).toEqual([sha('saopaulo')])
    expect(data.zp).toEqual([sha('01000000')])
    expect(JSON.stringify(data)).not.toContain('maria@example')
  })

  it('omite campos ausentes em vez de enviar vazio', async () => {
    const { hashedUserData } = await import('@/lib/tracking/server')
    const data = hashedUserData({ customer_name: 'Ana', customer_phone: '51999990000', customer_email: null, address: {} })
    expect(data.em).toBeUndefined()
    expect(data.zp).toBeUndefined()
  })
})
