import Image from 'next/image'

/** Imagem preenchendo o pai (que precisa ser `relative` e ter proporção). SVG local não passa pelo otimizador. */
export function ProductImage({
  src,
  alt,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw',
  priority = false,
  className = 'object-cover',
}: {
  src: string
  alt: string
  sizes?: string
  priority?: boolean
  className?: string
}) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={src.endsWith('.svg')} className={className} />
}
