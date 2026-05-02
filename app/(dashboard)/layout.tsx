import { createClient } from '@/lib/supabase/server'
import { getTemaClinica } from '@/lib/theme-server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let clinica
  try {
    clinica = await getClinicaDoUsuario(user.id)
  } catch {
    redirect('/login')
  }

  const tema = await getTemaClinica(clinica.id)

  return (
    <ThemeProvider tema={tema}>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--cor-fundo)' }}>
        <Sidebar clinica={clinica} tema={tema} />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Header clinica={clinica} userName={user.email ?? undefined} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
