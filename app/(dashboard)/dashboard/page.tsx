import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { KPIGrid } from '@/components/dashboard/KPIGrid'
import { GraficoReceita } from '@/components/dashboard/GraficoReceita'
import { GraficoOrigemLeads } from '@/components/dashboard/GraficoOrigemLeads'
import { ScoreOpus } from '@/components/dashboard/ScoreOpus'
import { AgendamentosHoje } from '@/components/dashboard/AgendamentosHoje'
import { LeadsRecentes } from '@/components/dashboard/LeadsRecentes'
import type { DashboardKPIs } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const clinica = await getClinicaDoUsuario(user!.id)

  const seisMesesAtras = new Date()
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6)

  const semanaAtras = new Date()
  semanaAtras.setDate(semanaAtras.getDate() - 7)

  const hoje = new Date().toISOString().split('T')[0]

  const [{ data: metricas }, { data: leadsRecentes }, { data: agendamentosHoje }, { data: leadsTotal }] = await Promise.all([
    supabase
      .from('metricas_diarias')
      .select('*')
      .eq('clinica_id', clinica.id)
      .gte('data', seisMesesAtras.toISOString().split('T')[0])
      .order('data', { ascending: true }),

    supabase
      .from('leads')
      .select('*, contatos(nome, telefone)')
      .eq('clinica_id', clinica.id)
      .gte('criado_em', semanaAtras.toISOString())
      .order('criado_em', { ascending: false })
      .limit(5),

    supabase
      .from('agendamentos')
      .select('*, contatos(nome, telefone)')
      .eq('clinica_id', clinica.id)
      .gte('data_hora', `${hoje}T00:00:00`)
      .lte('data_hora', `${hoje}T23:59:59`)
      .order('data_hora', { ascending: true }),

    supabase
      .from('leads')
      .select('id, origem, temperatura')
      .eq('clinica_id', clinica.id)
      .limit(200),
  ])

  const mesAtual = new Date().toISOString().slice(0, 7)
  const mesPassado = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })()

  const metricasMesAtual  = (metricas || []).filter(m => m.data.startsWith(mesAtual))
  const metricasMesPassado = (metricas || []).filter(m => m.data.startsWith(mesPassado))

  const soma = (arr: typeof metricasMesAtual, campo: keyof (typeof arr)[0]) =>
    arr.reduce((s, m) => s + (Number(m[campo]) || 0), 0)

  const mediaConversao = (arr: typeof metricasMesAtual) => {
    const comDados = arr.filter(m => m.taxa_conversao !== null)
    return comDados.length > 0 ? soma(comDados, 'taxa_conversao') / comDados.length : 0
  }

  const kpis: DashboardKPIs = {
    receita:       { atual: soma(metricasMesAtual, 'receita'),                      anterior: soma(metricasMesPassado, 'receita') },
    leads:         { atual: soma(metricasMesAtual, 'leads_novos'),                  anterior: soma(metricasMesPassado, 'leads_novos') },
    consultas:     { atual: soma(metricasMesAtual, 'consultas_realizadas'),         anterior: soma(metricasMesPassado, 'consultas_realizadas') },
    procedimentos: { atual: soma(metricasMesAtual, 'procedimentos_realizados'),     anterior: soma(metricasMesPassado, 'procedimentos_realizados') },
    noShow:        { atual: soma(metricasMesAtual, 'no_show_count'),                anterior: soma(metricasMesPassado, 'no_show_count') },
    taxaConversao: { atual: mediaConversao(metricasMesAtual),                       anterior: mediaConversao(metricasMesPassado) },
  }

  return (
    <div className="space-y-6">
      <KPIGrid kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GraficoReceita metricas={metricas || []} />
        </div>
        <div>
          <ScoreOpus metricas={metricas || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <GraficoOrigemLeads leads={(leadsTotal || []) as Parameters<typeof GraficoOrigemLeads>[0]['leads']} />
        </div>
        <div>
          <AgendamentosHoje agendamentos={(agendamentosHoje || []) as Parameters<typeof AgendamentosHoje>[0]['agendamentos']} />
        </div>
        <div>
          <LeadsRecentes leads={(leadsRecentes || []) as Parameters<typeof LeadsRecentes>[0]['leads']} />
        </div>
      </div>
    </div>
  )
}
