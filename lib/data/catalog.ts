import { cacheLife, cacheTag } from 'next/cache'
import { publicClient } from '@/lib/supabase/public'
import type { Banner, Category, ProductFull, StoreSettings } from '@/lib/types'

const PRODUCT_SELECT =
  '*, category:categories(name, slug), images:product_images(id, url, sort_order), variants:product_variants(*)'

function normalizeProduct(row: unknown): ProductFull {
  const p = row as ProductFull
  return {
    ...p,
    images: [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    variants: [...(p.variants ?? [])].filter((v) => v.active).sort((a, b) => a.sort_order - b.sort_order),
  }
}

export async function getStoreSettings(): Promise<StoreSettings> {
  'use cache'
  cacheTag('settings')
  cacheLife('hours')
  const { data, error } = await publicClient().from('store_settings').select('*').eq('id', 1).single()
  if (error) throw new Error(`store_settings: ${error.message}`)
  return data as StoreSettings
}

export async function getCategories(): Promise<Category[]> {
  'use cache'
  cacheTag('categories')
  cacheLife('hours')
  const { data, error } = await publicClient()
    .from('categories')
    .select('*')
    .eq('active', true)
    .order('sort_order')
    .order('name')
  if (error) throw new Error(`categories: ${error.message}`)
  return data as Category[]
}

export async function getBanners(): Promise<Banner[]> {
  'use cache'
  cacheTag('banners')
  cacheLife('hours')
  const { data, error } = await publicClient().from('banners').select('*').eq('active', true).order('sort_order')
  if (error) throw new Error(`banners: ${error.message}`)
  return data as Banner[]
}

export async function getProducts(options: { categorySlug?: string; featuredOnly?: boolean; limit?: number } = {}): Promise<ProductFull[]> {
  'use cache'
  cacheTag('products')
  cacheLife('hours')
  const { categorySlug, featuredOnly, limit } = options
  let query = publicClient().from('products').select(PRODUCT_SELECT).eq('active', true)
  if (featuredOnly) query = query.eq('featured', true)
  if (categorySlug) {
    const { data: cat } = await publicClient().from('categories').select('id').eq('slug', categorySlug).eq('active', true).maybeSingle()
    if (!cat) return []
    query = query.eq('category_id', cat.id)
  }
  query = query.order('created_at', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) throw new Error(`products: ${error.message}`)
  return (data ?? []).map(normalizeProduct)
}

export async function getProductBySlug(slug: string): Promise<ProductFull | null> {
  'use cache'
  cacheTag('products')
  cacheLife('hours')
  const { data, error } = await publicClient().from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('active', true).maybeSingle()
  if (error) throw new Error(`product: ${error.message}`)
  return data ? normalizeProduct(data) : null
}

export async function getAllSlugs(): Promise<{ products: string[]; categories: string[] }> {
  'use cache'
  cacheTag('products', 'categories')
  cacheLife('hours')
  const db = publicClient()
  const [p, c] = await Promise.all([
    db.from('products').select('slug').eq('active', true),
    db.from('categories').select('slug').eq('active', true),
  ])
  return {
    products: (p.data ?? []).map((r) => r.slug as string),
    categories: (c.data ?? []).map((r) => r.slug as string),
  }
}
