import { browserClient } from '@/lib/supabase/browser'

async function resizeToWebp(file: Blob, maxSize: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Formato de imagem não suportado. Use JPG, PNG, WebP ou HEIC.')
  })
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

// Fotos de iPhone (HEIC/HEIF): o Chrome/Edge não decodificam, e no Windows o arquivo pode chegar sem tipo MIME.
function isHeicFile(file: File): boolean {
  return /^image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

async function decodable(file: File): Promise<Blob> {
  if (!isHeicFile(file)) return file
  // carregado só quando alguém envia HEIC (a biblioteca é pesada)
  const { heicTo } = await import('heic-to/next')
  try {
    return await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
  } catch {
    throw new Error('Não foi possível ler esta foto HEIC. Exporte como JPG e tente de novo.')
  }
}

/** Redimensiona (máx. 1600px) e converte para WebP no navegador antes de enviar ao Storage (bucket público "catalog"). */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith('image/') && !isHeicFile(file)) throw new Error('Escolha um arquivo de imagem.')
  const blob = await resizeToWebp(await decodable(file), 1600)
  const path = `${folder}/${crypto.randomUUID()}.webp`
  const supabase = browserClient()
  const { error } = await supabase.storage.from('catalog').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' })
  if (error) throw new Error(error.message)
  return supabase.storage.from('catalog').getPublicUrl(path).data.publicUrl
}
