import { ActionForm } from '@/components/admin/ui'
import { requireAdmin } from '@/lib/admin/auth'
import { changePasswordAction } from './actions'

export const metadata = { title: 'Alterar senha' }

export default async function SenhaPage() {
  const { user } = await requireAdmin({ allowPasswordChange: true })
  const forced = Boolean(user.user_metadata?.must_change_password)
  return (
    <div className="flex min-h-screen items-center justify-center bg-dark p-4">
      <div className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="font-title text-2xl uppercase">Alterar senha</h1>
        {forced && <p className="text-sm text-ink/80">Este é o seu primeiro acesso. Defina uma senha nova para continuar.</p>}
        <ActionForm action={changePasswordAction} submitLabel="Salvar nova senha">
          <div>
            <label className="label" htmlFor="password">Nova senha (mínimo 10 caracteres)</label>
            <input id="password" name="password" type="password" className="input" required minLength={10} autoComplete="new-password" />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Repita a nova senha</label>
            <input id="confirm" name="confirm" type="password" className="input" required minLength={10} autoComplete="new-password" />
          </div>
        </ActionForm>
      </div>
    </div>
  )
}
