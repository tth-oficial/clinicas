import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PainelAdmin } from '@/components/admin/PainelAdmin'

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const fallback = process.env.ADMIN_EMAIL?.toLowerCase()
  return adminEmails.includes(email.toLowerCase()) ||
    (!!fallback && email.toLowerCase() === fallback)
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email ?? '')) redirect('/dashboard')

  const admin = createAdminClient()

  const { data: clinicas } = await admin
    .from('clinicas')
    .select(`
      id, nome, responsavel, especialidade, cidade, plano, ativo, criado_em,
      clinica_config (
        cor_principal, nome_exibicao, agente_nome,
        evolution_instance, openai_api_key, atualizado_em
      )
    `)
    .order('criado_em', { ascending: false })

  const { data: usuarios } = await admin
    .from('usuarios_clinicas')
    .select('clinica_id, papel')

  const totalClinicas = clinicas?.length ?? 0
  const ativas = clinicas?.filter(c => c.ativo).length ?? 0
  const comWhatsApp = clinicas?.filter(c => {
    const cfg = Array.isArray(c.clinica_config) ? c.clinica_config[0] : c.clinica_config
    return cfg?.evolution_instance
  }).length ?? 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            {totalClinicas} clínica{totalClinicas !== 1 ? 's' : ''} cadastrada{totalClinicas !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/novo-cliente"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#1B5E4F' }}
        >
          + Novo cliente
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de clínicas', valor: totalClinicas, cor: '#2D8B73' },
          { label: 'Ativas', valor: ativas, cor: '#22C55E' },
          { label: 'Com WhatsApp', valor: comWhatsApp, cor: '#3B82F6' },
        ].map(k => (
          <div key={k.label}
            className="rounded-xl p-4 border"
            style={{ background: '#0F1511', borderColor: '#1F2B27' }}>
            <p className="text-xs mb-1" style={{ color: '#6B7280' }}>{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.cor }}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Lista de clientes */}
      <PainelAdmin
        clinicas={(clinicas ?? []).map(c => {
          const cfg = Array.isArray(c.clinica_config) ? c.clinica_config[0] : c.clinica_config
          const usuariosClinica = (usuarios ?? []).filter(u => u.clinica_id === c.id)
          return {
            id: c.id,
            nome: c.nome,
            responsavel: c.responsavel ?? '',
            especialidade: c.especialidade ?? '',
            cidade: c.cidade ?? '',
            plano: c.plano,
            ativo: c.ativo,
            criado_em: c.criado_em,
            cor_principal: cfg?.cor_principal ?? '#1B5E4F',
            nome_exibicao: cfg?.nome_exibicao ?? c.nome,
            agente_nome: cfg?.agente_nome ?? 'Assistente',
            evolution_instance: cfg?.evolution_instance ?? null,
            tem_openai: !!cfg?.openai_api_key,
            atualizado_em: cfg?.atualizado_em ?? c.criado_em,
            total_usuarios: usuariosClinica.length,
          }
        })}
      />
    </div>
  )
}
