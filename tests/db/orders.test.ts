import { describe, expect, it } from 'vitest'
import { asAdmin, backToOwner, hasDb, inTransaction, orderPayload, variantId } from './helpers'

describe.skipIf(!hasDb)('regras de pedido no banco (rollback ao final)', () => {
  it('create_order recalcula preço, taxa de personalização e cupom no servidor', async () => {
    await inTransaction(async (c) => {
      const kit = await variantId(c, 'KIT-NAT') // promo 169,90 + taxa 25,00 com texto
      const cuiaP = await variantId(c, 'CUI-P') // preço da variante 79,90
      const { rows } = await c.query('select public.create_order($1::jsonb) as r', [
        JSON.stringify(
          orderPayload(
            [
              { variant_id: kit, quantity: 1, personalization_text: 'João' },
              { variant_id: cuiaP, quantity: 2 },
            ],
            { coupon_code: 'bemvindo10' },
          ),
        ),
      ])
      const r = rows[0].r
      // (169,90 + 25,00) + 2 x 79,90 = 354,70. Cupom 10% = 35,47 (pedido mínimo 100 ok)
      expect(Number(r.subtotal)).toBeCloseTo(354.7, 2)
      expect(Number(r.discount)).toBeCloseTo(35.47, 2)
      expect(Number(r.total)).toBeCloseTo(319.23, 2)
      const items = await c.query('select * from public.order_items where order_id = $1 order by unit_price desc', [r.id])
      expect(items.rows).toHaveLength(2)
      expect(items.rows[0].personalization_text).toBe('João')
      expect(Number(items.rows[0].personalization_fee)).toBe(25)
    })
  })

  it('ignora preço enviado pelo navegador e texto em produto sem personalização', async () => {
    await inTransaction(async (c) => {
      const brinco = await variantId(c, 'BRI-UN')
      const { rows } = await c.query('select public.create_order($1::jsonb) as r', [
        JSON.stringify(
          orderPayload([{ variant_id: brinco, quantity: 1, price: 0.01, unit_price: 0.01, personalization_text: 'x' }]),
        ),
      ])
      expect(Number(rows[0].r.total)).toBeCloseTo(59.9, 2)
      const it = await c.query('select personalization_text from public.order_items where order_id = $1', [rows[0].r.id])
      expect(it.rows[0].personalization_text).toBeNull()
    })
  })

  it('rejeita personalização obrigatória ausente, estoque zerado e cupom inválido', async () => {
    await inTransaction(async (c) => {
      const faca = await variantId(c, 'FAC-UN')
      await c.query('savepoint s1')
      await expect(
        c.query('select public.create_order($1::jsonb)', [JSON.stringify(orderPayload([{ variant_id: faca, quantity: 1 }]))]),
      ).rejects.toThrow(/personalizacao_obrigatoria/)
      await c.query('rollback to savepoint s1')

      const cuiaG = await variantId(c, 'CUI-G') // estoque 0
      await expect(
        c.query('select public.create_order($1::jsonb)', [JSON.stringify(orderPayload([{ variant_id: cuiaG, quantity: 1 }]))]),
      ).rejects.toThrow(/estoque_insuficiente/)
      await c.query('rollback to savepoint s1')

      const brinco = await variantId(c, 'BRI-UN')
      await expect(
        c.query('select public.create_order($1::jsonb)', [
          JSON.stringify(orderPayload([{ variant_id: brinco, quantity: 1 }], { coupon_code: 'NAOEXISTE' })),
        ]),
      ).rejects.toThrow(/cupom_invalido/)
      await c.query('rollback to savepoint s1')

      await expect(
        c.query('select public.create_order($1::jsonb)', [
          JSON.stringify(orderPayload([{ variant_id: brinco, quantity: 1 }], { coupon_code: 'BEMVINDO10' })),
        ]),
      ).rejects.toThrow(/cupom_minimo/) // 59,90 < pedido mínimo 100
    })
  })

  it('estoque só baixa na confirmação e volta ao cancelar um pedido confirmado', async () => {
    await inTransaction(async (c) => {
      const cam = await variantId(c, 'CAM-P') // estoque 5
      const { rows } = await c.query('select public.create_order($1::jsonb) as r', [
        JSON.stringify(orderPayload([{ variant_id: cam, quantity: 2 }])),
      ])
      const orderId = rows[0].r.id as string
      const stock = async () =>
        Number((await c.query('select stock_quantity from public.product_variants where id = $1', [cam])).rows[0].stock_quantity)

      expect(await stock()).toBe(5) // criar pedido não baixa estoque

      await asAdmin(c)
      await c.query('select public.change_order_status($1, $2)', [orderId, 'confirmado'])
      await backToOwner(c)
      expect(await stock()).toBe(3)

      await asAdmin(c)
      await c.query('select public.change_order_status($1, $2)', [orderId, 'cancelado'])
      await backToOwner(c)
      expect(await stock()).toBe(5)

      const hist = await c.query('select to_status from public.order_status_history where order_id = $1 order by created_at', [orderId])
      expect(hist.rows.map((h) => h.to_status)).toEqual(['novo', 'confirmado', 'cancelado'])
    })
  })

  it('confirmar com estoque insuficiente falha, e transições inválidas são barradas', async () => {
    await inTransaction(async (c) => {
      const cam = await variantId(c, 'CAM-G') // estoque 3
      const { rows } = await c.query('select public.create_order($1::jsonb) as r', [
        JSON.stringify(orderPayload([{ variant_id: cam, quantity: 3 }])),
      ])
      const orderId = rows[0].r.id as string
      await c.query('update public.product_variants set stock_quantity = 1 where id = $1', [cam]) // outro pedido levou

      await asAdmin(c)
      await c.query('savepoint s1')
      await expect(c.query('select public.change_order_status($1, $2)', [orderId, 'confirmado'])).rejects.toThrow(/estoque_insuficiente/)
      await c.query('rollback to savepoint s1')
      await expect(c.query('select public.change_order_status($1, $2)', [orderId, 'entregue'])).rejects.toThrow(/transicao_invalida/)
    })
  })

  it('quem não é admin não consegue mudar status', async () => {
    await inTransaction(async (c) => {
      const brinco = await variantId(c, 'BRI-UN')
      const { rows } = await c.query('select public.create_order($1::jsonb) as r', [
        JSON.stringify(orderPayload([{ variant_id: brinco, quantity: 1 }])),
      ])
      await c.query(`select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true)`)
      await c.query('set local role authenticated')
      await expect(c.query('select public.change_order_status($1, $2)', [rows[0].r.id, 'confirmado'])).rejects.toThrow(/nao_autorizado/)
    })
  })
})
