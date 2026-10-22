import { describe, expect, it } from 'vitest'
import { hasDb, inTransaction, orderPayload, variantId } from './helpers'

async function asAnon(c: import('pg').Client) {
  await c.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`)
  await c.query('set local role anon')
}

describe.skipIf(!hasDb)('RLS: o visitante (anon) só enxerga a vitrine', () => {
  it('lê catálogo ativo e configurações públicas', async () => {
    await inTransaction(async (c) => {
      await asAnon(c)
      const products = await c.query('select count(*)::int as n from public.products')
      expect(products.rows[0].n).toBeGreaterThan(0)
      const settings = await c.query('select name from public.store_settings')
      expect(settings.rows[0].name).toBe('Alma Campeira')
    })
  })

  it('NÃO lê pedidos, itens, cupons, segredos de integração nem admins', async () => {
    for (const table of ['orders', 'order_items', 'coupons', 'integration_secrets', 'admins', 'order_attempts', 'tracking_events']) {
      await inTransaction(async (c) => {
        await asAnon(c)
        await expect(c.query(`select * from public.${table}`)).rejects.toThrow(/permission denied/)
      })
    }
  })

  it('NÃO escreve no catálogo nem chama create_order / change_order_status', async () => {
    await inTransaction(async (c) => {
      const cam = await variantId(c, 'CAM-P')
      await asAnon(c)
      await c.query('savepoint s1')
      await expect(c.query(`update public.products set base_price = 0.01`)).rejects.toThrow(/permission denied/)
      await c.query('rollback to savepoint s1')
      await expect(c.query(`insert into public.coupons (code, type, value) values ('X','fixed',1)`)).rejects.toThrow(/permission denied/)
      await c.query('rollback to savepoint s1')
      await expect(
        c.query('select public.create_order($1::jsonb)', [JSON.stringify(orderPayload([{ variant_id: cam, quantity: 1 }]))]),
      ).rejects.toThrow(/permission denied/)
      await c.query('rollback to savepoint s1')
      await expect(
        c.query('select public.change_order_status($1, $2)', ['00000000-0000-0000-0000-000000000000', 'confirmado']),
      ).rejects.toThrow(/permission denied/)
    })
  })

  it('produtos inativos não aparecem para o visitante', async () => {
    await inTransaction(async (c) => {
      await c.query(`update public.products set active = false where slug = 'brinco-flor-dourada-exemplo'`)
      await asAnon(c)
      const r = await c.query(`select count(*)::int as n from public.products where slug = 'brinco-flor-dourada-exemplo'`)
      expect(r.rows[0].n).toBe(0)
    })
  })
})
