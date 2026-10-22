import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proteção otimista do /admin: renova a sessão do Supabase e manda quem não está logado para o login.
 * A autorização de verdade acontece em requireAdmin() (lib/admin/auth.ts) e nas policies de RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of list) response.cookies.set(name, value, options)
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLogin = request.nextUrl.pathname === '/admin/login'
  if (!user && !isLogin) return NextResponse.redirect(new URL('/admin/login', request.url))
  if (user && isLogin) return NextResponse.redirect(new URL('/admin', request.url))

  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = { matcher: ['/admin/:path*'] }
