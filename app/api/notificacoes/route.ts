import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ notificacoes: [] })

  try {
    const clinica = await getClinicaDoUsuario(user.id)
    const agora = new Date()
    const ha30min = new Date(agora.getTime() - 30 * 60 * 1000).toISOString()
    const hoje = agora.toISOString().split('T')[0]

    const [leadsNovos, conversasEsperando, noShowHoje, relatorio] = await Promise.all([
      // Leads novos nas últimas 24h
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('clinica_id', clinica.id)
        .eq('status', 'novo')
        .gte('criado_em', new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString()),

      // Conversas aguardando resposta há mais de 30min
      supabase
        .from('conversas')
        .select('id', { count: 'exact', head: true })
        .eq('clinica_id', clinica.id)
        .eq('agente_ativo', false)
        .lte('atualizado_em', ha30min),

      // Agendamentos no-show hoje
      supabase
        .from('agendamentos')
        .select('id', { count: 'exact', head: true })
        .eq('clinica_id', clinica.id)
        .eq('status', 'no_show')
        .gte('data_hora', `${hoje}T00:00:00`)
        .lte('data_hora', `${hoje}T23:59:59`),

      // Relatório disponível desta semana
      supabase
        .from('relatorios')
        .select('id', { count: 'exact', head: true })
        .eq('clinica_id', clinica.id)
        .gte('criado_em', new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    const notificacoes = []

    if ((leadsNovos.count ?? 0) > 0) {
      notificacoes.push({
        id: 'leads-novos',
        tipo: 'lead',
        titulo: `${leadsNovos.count} lead${leadsNovos.count === 1 ? '' : 's'} novo${leadsNovos.count === 1 ? '' : 's'}`,
        descricao: 'nas últimas 24 horas',
        href: '/leads',
      })
    }

    if ((conversasEsperando.count ?? 0) > 0) {
      notificacoes.push({
        id: 'aguardando',
        tipo: 'mensagem',
        titulo: `${conversasEsperando.count} paciente${conversasEsperando.count === 1 ? '' : 's'} aguardando`,
        descricao: 'sem resposta há mais de 30 min',
        href: '/whatsapp',
      })
    }

    if ((noShowHoje.count ?? 0) > 0) {
      notificacoes.push({
        id: 'noshow',
        tipo: 'alerta',
        titulo: `${noShowHoje.count} no-show hoje`,
        descricao: 'considere reagendar',
        href: '/anti-no-show',
      })
    }

    if ((relatorio.count ?? 0) > 0) {
      notificacoes.push({
        id: 'relatorio',
        tipo: 'relatorio',
        titulo: 'Relatório semanal disponível',
        descricao: 'gerado pela IA',
        href: '/relatorio',
      })
    }

    return Response.json({ notificacoes })
  } catch (err) {
    console.error('[Notificacoes] erro', err)
    return Response.json({ notificacoes: [] })
  }
}
