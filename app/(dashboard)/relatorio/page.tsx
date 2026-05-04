import type { Metadata } from 'next'
import { PainelRelatorio } from '@/components/relatorio/PainelRelatorio'

export const metadata: Metadata = {
  title: 'Relatório Semanal | Opus Clínicas',
  description: 'Relatório semanal gerado por IA com métricas e recomendações',
}

export default function RelatorioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--cor-texto)' }}>
          Relatório Semanal
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
          Gerado automaticamente toda segunda-feira com resumo executivo por IA, 6 métricas com variação e ações recomendadas.
        </p>
      </div>

      <PainelRelatorio />
    </div>
  )
}
