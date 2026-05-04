import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { FiltrosLeads } from '@/components/leads/FiltrosLeads'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Lead } from '@/types'

interface LeadsPageProps {
  searchParams: Promise<{
    etapa?: string
    temperatura?: string
    status?: string
    busca?: string
    page?: string
  }>
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clinica = await getClinicaDoUsuario(user.id)

  const page  = Math.max(1, parseInt(params.page ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  // Filtro de busca por nome/telefone (subquery em contatos)
  let contatoIdsFiltro: string[] | null = null
  if (params.busca) {
    const { data: contatos } = await supabase
      .from('contatos')
      .select('id')
      .eq('clinica_id', clinica.id)
      .or(`nome.ilike.%${params.busca}%,telefone.ilike.%${params.busca}%`)
    contatoIdsFiltro = (contatos ?? []).map(c => c.id)
  }

  // Sem resultados na busca → devolve página vazia
  if (contatoIdsFiltro !== null && contatoIdsFiltro.length === 0) {
    return (
      <LeadsLayout total={0}>
        <FiltrosLeads filtros={params} />
        <LeadsTable leads={[]} total={0} page={page} limit={limit} />
      </LeadsLayout>
    )
  }

  let query = supabase
    .from('leads')
    .select('*, contatos(id, nome, telefone)', { count: 'exact' })
    .eq('clinica_id', clinica.id)
    .order('criado_em', { ascending: false })

  if (params.etapa)       query = query.eq('etapa', params.etapa)
  if (params.temperatura) query = query.eq('temperatura', params.temperatura)
  if (params.status)      query = query.eq('status', params.status)
  if (contatoIdsFiltro)   query = query.in('contato_id', contatoIdsFiltro)

  query = query.range(offset, offset + limit - 1)

  const { data: leads, count } = await query
  const total = count ?? 0

  return (
    <LeadsLayout total={total}>
      <FiltrosLeads filtros={params} />
      <LeadsTable leads={(leads ?? []) as Lead[]} total={total} page={page} limit={limit} />
    </LeadsLayout>
  )
}

function LeadsLayout({
  total,
  children,
}: {
  total: number
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--cor-texto)' }}>Leads</h1>
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
            {total} {total === 1 ? 'lead encontrado' : 'leads encontrados'}
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
      {children}
    </div>
  )
}
