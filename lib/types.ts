export type Theme = {
  bg_dark: string
  primary: string
  secondary: string
  accent: string
  bg_light: string
  text: string
}

export type StoreSettings = {
  id: number
  name: string
  tagline: string
  logo_url: string
  whatsapp_number: string
  message_template: string
  business_hours: string
  pickup_address: string
  delivery_note: string
  instagram_url: string
  about_text: string
  privacy_text: string
  theme: Theme
  meta_pixel_id: string | null
  ga4_measurement_id: string | null
}

export type Category = {
  id: string
  name: string
  slug: string
  sort_order: number
  active: boolean
}

export type Banner = {
  id: string
  image_url: string
  title: string | null
  subtitle: string | null
  link_url: string | null
  sort_order: number
  active: boolean
}

export type Variant = {
  id: string
  product_id: string
  sku: string | null
  option_values: Record<string, string>
  price: number | null
  stock_quantity: number
  active: boolean
  sort_order: number
  /** URLs (da galeria do produto) ligadas a esta variação */
  image_urls: string[]
}

export type ProductImage = { id?: string; url: string; sort_order: number }

export type Product = {
  id: string
  category_id: string | null
  name: string
  slug: string
  description: string
  base_price: number
  promo_price: number | null
  option_names: string[]
  active: boolean
  featured: boolean
  is_demo: boolean
  allows_personalization: boolean
  personalization_label: string
  personalization_required: boolean
  personalization_max_length: number
  personalization_fee: number
}

export type ProductFull = Product & {
  category: { name: string; slug: string } | null
  images: ProductImage[]
  variants: Variant[]
}

export type OrderStatus = 'novo' | 'confirmado' | 'entregue' | 'cancelado'

export type Address = {
  cep?: string
  street?: string
  number?: string
  complement?: string
  district?: string
  city?: string
  state?: string
}

export type OrderTracking = {
  ip?: string
  user_agent?: string
  fbp?: string
  fbc?: string
  gclid?: string
  fbclid?: string
  ga_client_id?: string
  source_url?: string
}

export type Order = {
  id: string
  number: number
  customer_name: string
  customer_phone: string
  customer_email: string | null
  fulfillment: 'pickup' | 'delivery'
  address: Address
  payment_preference: string | null
  notes: string | null
  subtotal: number
  discount: number
  total: number
  coupon_id: string | null
  coupon_code: string | null
  status: OrderStatus
  stock_deducted: boolean
  event_id: string
  tracking: OrderTracking
  is_test: boolean
  created_at: string
  confirmed_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
}

export type OrderItem = {
  id: string
  order_id: string
  variant_id: string | null
  product_id: string | null
  product_name: string
  variant_label: string | null
  unit_price: number
  personalization_text: string | null
  personalization_fee: number
  quantity: number
  line_total: number
}

export type Coupon = {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_order: number
  starts_at: string | null
  ends_at: string | null
  max_uses: number | null
  used_count: number
  active: boolean
}
