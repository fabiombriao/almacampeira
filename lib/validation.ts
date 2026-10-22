import { z } from 'zod'
import { onlyDigits } from './format'

export const cartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  personalizationText: z.string().max(200).nullable().optional(),
})

export const trackingInputSchema = z
  .object({
    gclid: z.string().max(300),
    fbclid: z.string().max(300),
    ga_client_id: z.string().max(100),
    source_url: z.string().max(500),
  })
  .partial()

export const addressSchema = z
  .object({
    cep: z.string().max(12),
    street: z.string().trim().max(160),
    number: z.string().trim().max(20),
    complement: z.string().trim().max(80),
    district: z.string().trim().max(80),
    city: z.string().trim().max(80),
    state: z.string().trim().max(2),
  })
  .partial()

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, 'Informe seu nome').max(120),
    phone: z.string().refine((v) => {
      const d = onlyDigits(v)
      return d.length >= 10 && d.length <= 13
    }, 'Informe um telefone com DDD'),
    email: z.union([z.literal(''), z.email('E-mail inválido').max(160)]).optional(),
  }),
  fulfillment: z.enum(['pickup', 'delivery']),
  address: addressSchema.optional(),
  payment_preference: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
  coupon_code: z.string().max(40).optional(),
  items: z.array(cartItemSchema).min(1, 'Seu carrinho está vazio').max(50),
  tracking: trackingInputSchema.optional(),
  /** honeypot: pessoas não preenchem, robôs sim */
  website: z.string().max(0).optional(),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
export type CartItemInput = z.infer<typeof cartItemSchema>

const ERROR_MESSAGES: Record<string, (arg: string) => string> = {
  estoque_insuficiente: (n) => `Estoque insuficiente para "${n}". Ajuste a quantidade no carrinho.`,
  item_indisponivel: () => 'Um dos itens não está mais disponível. Revise o carrinho.',
  personalizacao_obrigatoria: (n) => `Informe o texto de personalização de "${n}".`,
  personalizacao_longa: (n) => `O texto de personalização de "${n}" é maior que o permitido.`,
  cupom_invalido: () => 'Cupom inválido, expirado ou esgotado.',
  cupom_minimo: (n) => `Este cupom exige pedido mínimo de R$ ${Number(n).toFixed(2).replace('.', ',')}.`,
  muitas_tentativas: () => 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.',
  'dados_invalidos': (f) =>
    ({
      nome: 'Informe seu nome.',
      telefone: 'Informe um telefone com DDD.',
      recebimento: 'Escolha retirada ou entrega.',
      endereco: 'Preencha o endereço completo para entrega.',
      itens: 'Seu carrinho está vazio.',
      quantidade: 'Quantidade inválida.',
    })[f] ?? 'Dados inválidos.',
}

/** Converte a mensagem de erro do banco (ex.: "estoque_insuficiente:Cuia") em texto amigável. */
export function friendlyDbError(message: string): string {
  const [code, ...rest] = message.split(':')
  const handler = ERROR_MESSAGES[code.trim()]
  return handler ? handler(rest.join(':').trim()) : 'Não foi possível concluir. Tente novamente.'
}
