import type { Metadata } from 'next'
import { CheckoutForm } from '@/components/checkout-form'
import { getStoreSettings } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Finalizar pedido', robots: { index: false } }

export default async function CheckoutPage() {
  const settings = await getStoreSettings()
  return (
    <div className="container-page py-8">
      <h1 className="font-title mb-6 text-4xl uppercase">Finalizar pedido</h1>
      <CheckoutForm deliveryNote={settings.delivery_note} pickupAddress={settings.pickup_address} />
    </div>
  )
}
