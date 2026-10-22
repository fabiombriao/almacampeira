import { browserClient } from '@/lib/supabase/browser'

async function resizeToWebp(file: File, maxSize: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))), 'image/webp', 0.85)
  })
}

/** Redimensiona (máx. 1600px) e converte para WebP no navegador antes de enviar ao Storage (bucket público "catalog"). */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  const blob = await resizeToWebp(file, 1600)
  const path = `${folder}/${crypto.randomUUID()}.webp`
  const supabase = browserClient()
  const { error } = await supabase.storage.from('catalog').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' })
  if (error) throw new Error(error.message)
  return supabase.storage.from('catalog').getPublicUrl(path).data.publicUrl
}
