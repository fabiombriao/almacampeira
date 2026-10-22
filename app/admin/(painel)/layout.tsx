import Image from 'next/image'
import Link from 'next/link'
import { signOutAction } from '@/app/admin/login/actions'
import { requireAdmin } from '@/lib/admin/auth'

// Painel autenticado (ver app/admin/layout.tsx): fora da validação de navegação instantânea.
export const instant = false

const NAV = [
  { href: '/admin', label: 'Início' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/produtos', label: 'Produtos' },
  { href: '/admin/categorias', label: 'Categorias' },
  { href: '/admin/cupons', label: 'Cupons' },
  { href: '/admin/aparencia', label: 'Aparência' },
  { href: '/admin/loja', label: 'Loja e WhatsApp' },
  { href: '/admin/integracoes', label: 'Integrações' },
]

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin()
  return (
    <div className="min-h-screen bg-light md:flex">
      <aside className="bg-dark text-light md:min-h-screen md:w-60 md:shrink-0">
        <div className="flex items-center gap-3 border-b border-accent/20 p-4">
          <Image src="/logo.jpg" alt="" width={40} height={40} className="rounded-sm" />
          <span className="font-title text-lg uppercase tracking-widest text-accent">Painel</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 text-sm md:flex-col md:overflow-visible" aria-label="Menu do painel">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded px-3 py-2 hover:bg-accent/15">
              {item.label}
            </Link>
          ))}
          <Link href="/" target="_blank" className="whitespace-nowrap rounded px-3 py-2 text-accent hover:bg-accent/15">
            Ver loja ↗
          </Link>
        </nav>
        <div className="hidden border-t border-accent/20 p-4 text-xs text-light/70 md:block">
          <p className="truncate">{user.email}</p>
          <Link href="/admin/senha" className="mt-1 block underline">Alterar senha</Link>
          <form action={signOutAction} className="mt-2">
            <button type="submit" className="underline">Sair</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-4 md:p-8">{children}</div>
    </div>
  )
}
