import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Lead } from '@/types'

export default async function CRMPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clinica = await getClinicaDoUsuario(user.id)

  const { data: leads } = await supabase
    .from('leads')
    .select('*, contatos(id, nome, telefone)')
    .eq('clinica_id', clinica.id)
    .neq('status', 'perdido')
    .order('posicao_kanban', { ascending: true })
    .order('criado_em', { ascending: false })

  const total = leads?.length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--cor-texto)' }}>CRM — Pipeline</h1>
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
            {total} {total === 1 ? 'lead ativo' : 'leads ativos'}
          </p>
        </div>
        <Link
          href="/crm/novo"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--cor-primaria)' }}
        >
          <Plus size={15} />
          Novo Lead
        </Link>
      </div>

      <KanbanBoard leadsIniciais={(leads ?? []) as Lead[]} />
    </div>
  )
}
