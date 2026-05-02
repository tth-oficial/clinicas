import { calcularVariacao, formatarMoeda } from '@/lib/utils'
import type { KPIData } from '@/types'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  label: string
  kpi: KPIData
  formato?: 'numero' | 'moeda' | 'percentual'
  Icon: LucideIcon
  invertido?: boolean
}

function formatarValor(valor: number, formato: KPICardProps['formato']): string {
  if (formato === 'moeda') return formatarMoeda(valor)
  if (formato === 'percentual') return `${valor.toFixed(1)}%`
  return valor.toLocaleString('pt-BR')
}

export function KPICard({ label, kpi, formato = 'numero', Icon, invertido = false }: KPICardProps) {
  const variacao = calcularVariacao(kpi.atual, kpi.anterior)
  const positivo = invertido ? variacao < 0 : variacao > 0
  const neutro = variacao === 0

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--cor-texto-suave)' }}>{label}</p>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--cor-primaria) 12%, transparent)' }}
        >
          <Icon size={17} style={{ color: 'var(--cor-primaria)' }} />
        </div>
      </div>

      <p className="text-2xl font-bold" style={{ color: 'var(--cor-texto)' }}>
        {formatarValor(kpi.atual, formato)}
      </p>

      <div className="flex items-center gap-1.5">
        {neutro ? (
          <Minus size={13} style={{ color: 'var(--cor-texto-suave)' }} />
        ) : positivo ? (
          <TrendingUp size={13} style={{ color: 'var(--cor-destaque)' }} />
        ) : (
          <TrendingDown size={13} style={{ color: '#EF4444' }} />
        )}
        <span
          className="text-xs font-medium"
          style={{ color: neutro ? 'var(--cor-texto-suave)' : positivo ? 'var(--cor-destaque)' : '#EF4444' }}
        >
          {neutro ? 'Igual ao mês anterior' : `${Math.abs(variacao)}% vs mês anterior`}
        </span>
      </div>
    </div>
  )
}
