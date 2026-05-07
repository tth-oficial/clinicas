import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth'
import Link from 'next/link'
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isSuperAdmin(user.email)) redirect('/dashboard')

  // Admin pode ou não ter clínica associada — só mostra "Voltar ao sistema" se tiver
  const { data: vinculoClinica } = await supabase
    .from('usuarios_clinicas')
    .select('clinica_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const temClinica = !!vinculoClinica?.clinica_id

  return (
    <div className="min-h-screen" style={{ background: '#0A0F0D' }}>
      {/* Header admin */}
      <header className="h-12 flex items-center justify-between px-6 border-b"
        style={{ background: '#0F1511', borderColor: '#1F2B27' }}>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-white">Opus Admin</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(27,94,79,0.3)', color: '#2D8B73' }}>
            Painel interno
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin"
            className="text-xs transition-opacity hover:opacity-80"
            style={{ color: '#9CA3AF' }}>
            Clientes
          </Link>
          <Link href="/admin/novo-cliente"
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{ background: '#1B5E4F', color: '#fff' }}>
            + Novo cliente
          </Link>
          {temClinica && (
            <Link href="/dashboard"
              className="text-xs transition-opacity hover:opacity-80"
              style={{ color: '#6B7280' }}>
              ← Voltar ao sistema
            </Link>
          )}
          <span className="text-xs hidden sm:inline" style={{ color: '#6B7280' }}>
            {user.email}
          </span>
          <AdminLogoutButton />
        </div>
      </header>

      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
