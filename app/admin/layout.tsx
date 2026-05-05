import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

// Emails com acesso ao painel admin (definir também em ADMIN_EMAILS no .env)
function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  // Fallback: se não configurado, usa o email do .env
  const fallback = process.env.ADMIN_EMAIL?.toLowerCase()

  return adminEmails.includes(email.toLowerCase()) ||
    (!!fallback && email.toLowerCase() === fallback)
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isAdmin(user.email ?? '')) redirect('/dashboard')

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
          <Link href="/dashboard"
            className="text-xs transition-opacity hover:opacity-80"
            style={{ color: '#6B7280' }}>
            ← Voltar ao sistema
          </Link>
        </div>
      </header>

      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
