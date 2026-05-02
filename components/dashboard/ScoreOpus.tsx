import type { MetricaDiaria } from '@/types'

interface ScoreOpusProps {
  metricas: MetricaDiaria[]
}

interface Dimensao {
  nome: string
  valor: number
  peso: number
}

function calcularScore(metricas: MetricaDiaria[]): { score: number; dimensoes: Dimensao[] } {
  if (metricas.length === 0) {
    return {
      score: 0,
      dimensoes: [
        { nome: 'Receita', valor: 0, peso: 30 },
        { nome: 'Leads', valor: 0, peso: 20 },
        { nome: 'Agendamentos', valor: 0, peso: 20 },
        { nome: 'Taxa Conversão', valor: 0, peso: 20 },
        { nome: 'Anti No-Show', valor: 0, peso: 10 },
      ],
    }
  }

  const totalReceita = metricas.reduce((s, m) => s + m.receita, 0)
  const totalLeads = metricas.reduce((s, m) => s + m.leads_novos, 0)
  const totalConsultas = metricas.reduce((s, m) => s + m.consultas_realizadas, 0)
  const totalNoShow = metricas.reduce((s, m) => s + m.no_show_count, 0)
  const totalNoShowTotal = metricas.reduce((s, m) => s + m.no_show_total, 0)
  const taxaMedia = metricas.filter(m => m.taxa_conversao !== null).reduce((s, m) => s + (m.taxa_conversao || 0), 0) / Math.max(1, metricas.filter(m => m.taxa_conversao !== null).length)

  const taxaNoShow = totalNoShowTotal > 0 ? (1 - totalNoShow / totalNoShowTotal) * 100 : 100

  const dimensoes: Dimensao[] = [
    { nome: 'Receita', valor: Math.min(10, totalReceita / 5000), peso: 30 },
    { nome: 'Leads', valor: Math.min(10, totalLeads / 2), peso: 20 },
    { nome: 'Agendamentos', valor: Math.min(10, totalConsultas / 3), peso: 20 },
    { nome: 'Taxa Conversão', valor: Math.min(10, taxaMedia / 10), peso: 20 },
    { nome: 'Anti No-Show', valor: taxaNoShow / 10, peso: 10 },
  ]

  const score = dimensoes.reduce((s, d) => s + (d.valor * d.peso) / 100, 0)

  return { score: Math.min(10, score), dimensoes }
}

export function ScoreOpus({ metricas }: ScoreOpusProps) {
  const { score, dimensoes } = calcularScore(metricas)
  const scoreFinal = Math.round(score * 10) / 10

  const corScore = scoreFinal >= 7 ? 'var(--cor-destaque)' : scoreFinal >= 4 ? '#F59E0B' : '#EF4444'

  return (
    <div
      className="rounded-xl p-5 h-full"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--cor-texto)' }}>
        Score Opus
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--cor-texto-suave)' }}>
        Saúde geral da clínica
      </p>

      <div className="flex items-center gap-3 mb-5">
        <span className="text-4xl font-bold" style={{ color: corScore }}>{scoreFinal}</span>
        <span className="text-xl" style={{ color: 'var(--cor-texto-suave)' }}>/10</span>
      </div>

      <div className="space-y-2.5">
        {dimensoes.map(d => (
          <div key={d.nome}>
            <div className="flex justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{d.nome}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--cor-texto)' }}>
                {Math.round(d.valor * 10) / 10}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--cor-borda)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(d.valor / 10) * 100}%`, background: 'var(--cor-primaria)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
