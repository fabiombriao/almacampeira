import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="font-title text-5xl uppercase">Página não encontrada</h1>
      <p className="mt-3 text-ink/70">O endereço que você tentou abrir não existe ou o produto saiu do catálogo.</p>
      <Link href="/produtos" className="btn btn-primary mt-6">
        Ver produtos
      </Link>
    </div>
  )
}
