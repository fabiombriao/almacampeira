import Image from 'next/image'
import { ActionForm } from '@/components/admin/ui'
import { signInAction } from './actions'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dark p-4">
      <div className="card w-full max-w-sm space-y-5 p-6">
        <div className="flex flex-col items-center gap-2">
          <Image src="/logo.jpg" alt="Alma Campeira" width={96} height={96} className="rounded" priority />
          <h1 className="font-title text-2xl uppercase">Painel da loja</h1>
        </div>
        <ActionForm action={signInAction} submitLabel="Entrar">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" className="input" required autoComplete="username" />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
          </div>
        </ActionForm>
      </div>
    </div>
  )
}
