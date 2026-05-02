import { KPICard } from '@/components/shared/KPICard'
import { DollarSign, UserPlus, Calendar, Stethoscope, AlertTriangle, TrendingUp } from 'lucide-react'
import type { DashboardKPIs } from '@/types'

interface KPIGridProps {
  kpis: DashboardKPIs
}

export function KPIGrid({ kpis }: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard label="Receita"        kpi={kpis.receita}       formato="moeda"      Icon={DollarSign} />
      <KPICard label="Leads"          kpi={kpis.leads}         formato="numero"     Icon={UserPlus} />
      <KPICard label="Consultas"      kpi={kpis.consultas}     formato="numero"     Icon={Calendar} />
      <KPICard label="Procedimentos"  kpi={kpis.procedimentos} formato="numero"     Icon={Stethoscope} />
      <KPICard label="No-shows"       kpi={kpis.noShow}        formato="numero"     Icon={AlertTriangle} invertido />
      <KPICard label="Tx. Conversão"  kpi={kpis.taxaConversao} formato="percentual" Icon={TrendingUp} />
    </div>
  )
}
