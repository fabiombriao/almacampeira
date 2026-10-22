import type { Metadata } from 'next'
import { CartView } from '@/components/cart-view'
import { getStoreSettings } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Carrinho' }

export default async function CarrinhoPage() {
  const settings = await getStoreSettings()
  return (
    <div className="container-page py-8">
      <h1 className="font-title mb-6 text-4xl uppercase">Carrinho</h1>
      <CartView deliveryNote={settings.delivery_note} />
    </div>
  )
}
