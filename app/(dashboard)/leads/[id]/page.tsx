import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Calendar, DollarSign } from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { formatarMoeda, formatarData, formatarHora } from '@/lib/utils'
import type { Agendamento, Contato, Lead } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  agendado: 'primario', confirmado: 'destaque', realizado: 'destaque',
  no_show: 'erro', cancelado: 'neutro', remarcado: 'aviso',
}

const ETAPA_LABEL: Record<string, string> = {
  lead: 'Lead', consulta_agendada: 'Consulta Agendada', negociacao: 'Em Negociação',
  procedimento: 'Procedimento', pos_venda: 'Pós-venda',
}

export default async function LeadPerfilPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clinica = await getClinicaDoUsuario(user.id)

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*, contatos(*)')
    .eq('id', id)
    .eq('clinica_id', clinica.id)
    .single()

  if (error || !lead) notFound()

  const contato = lead.contatos as unknown as Contato

  const [{ data: agendamentos }, { data: todosLeads }] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('*')
      .eq('clinica_id', clinica.id)
      .eq('contato_id', contato.id)
      .order('data_hora', { ascending: false })
      .limit(20),

    supabase
      .from('leads')
      .select('id, servico, etapa, status, valor_estimado, criado_em')
      .eq('clinica_id', clinica.id)
      .eq('contato_id', contato.id)
      .order('criado_em', { ascending: false }),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Voltar */}
      <div className="flex items-center gap-3">
        <Link
          href="/leads"
          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <ArrowLeft size={16} style={{ color: 'var(--cor-texto)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--cor-texto)' }}>{contato.nome}</h1>
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Perfil do contato</p>
        </div>
      </div>

      {/* Score / dados */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Phone size={14} style={{ color: 'var(--cor-texto-suave)' }} />
            <span className="text-sm" style={{ color: 'var(--cor-texto)' }}>{contato.telefone}</span>
          </div>
          {contato.email && (
            <div className="flex items-center gap-2">
              <Mail size={14} style={{ color: 'var(--cor-texto-suave)' }} />
              <span className="text-sm truncate" style={{ color: 'var(--cor-texto)' }}>{contato.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: 'var(--cor-texto-suave)' }} />
            <span className="text-sm" style={{ color: 'var(--cor-texto)' }}>
              {contato.total_procedimentos} procedimento{contato.total_procedimentos !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={14} style={{ color: 'var(--cor-texto-suave)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--cor-primaria)' }}>
              {formatarMoeda(contato.total_gasto)}
            </span>
          </div>
        </div>
        {contato.origem && (
          <div className="mt-3">
            <Badge variant="neutro">{contato.origem}</Badge>
          </div>
        )}
      </div>

      {/* Histórico de leads */}
      {todosLeads && todosLeads.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cor-texto)' }}>
            Histórico de Leads
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--cor-texto-suave)' }}>
              {todosLeads.length} {todosLeads.length === 1 ? 'registro' : 'registros'}
            </span>
          </h2>
          <div className="space-y-2">
            {(todosLeads as Pick<Lead, 'id' | 'servico' | 'etapa' | 'status' | 'valor_estimado' | 'criado_em'>[]).map(l => (
              <div
                key={l.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>{l.servico}</p>
                  <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{formatarData(l.criado_em)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {l.valor_estimado != null && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--cor-primaria)' }}>
                      {formatarMoeda(l.valor_estimado)}
                    </span>
                  )}
                  <Badge variant="neutro">{ETAPA_LABEL[l.etapa] ?? l.etapa}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agendamentos */}
      {agendamentos && agendamentos.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cor-texto)' }}>
            Agendamentos
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--cor-texto-suave)' }}>
              {agendamentos.length} {agendamentos.length === 1 ? 'registro' : 'registros'}
            </span>
          </h2>
          <div className="space-y-2">
            {(agendamentos as Agendamento[]).map(ag => (
              <div
                key={ag.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>{ag.servico}</p>
                  <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
                    {formatarData(ag.data_hora)} às {formatarHora(ag.data_hora)}
                    {ag.profissional ? ` — ${ag.profissional}` : ''}
                  </p>
                </div>
                <Badge variant={STATUS_BADGE[ag.status] ?? 'neutro'}>{ag.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state quando não há histórico */}
      {(!todosLeads || todosLeads.length === 0) && (!agendamentos || agendamentos.length === 0) && (
        <div
          className="rounded-xl p-10 flex flex-col items-center justify-center text-center"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
            Nenhum histórico encontrado para este contato
          </p>
        </div>
      )}
    </div>
  )
}
