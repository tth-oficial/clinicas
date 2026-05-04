import type { Metadata } from 'next'
import { ChatDecisao } from '@/components/ia-decisao/ChatDecisao'

export const metadata: Metadata = {
  title: 'IA de Decisão | Opus Clínicas',
  description: 'Analise dados da sua clínica com inteligência artificial',
}

export default function IADecisaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--cor-texto)' }}>
          IA de Decisão
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
          Faça perguntas estratégicas sobre sua clínica. A IA analisa dados reais — receita, leads, agendamentos e conversão.
        </p>
      </div>

      <ChatDecisao />
    </div>
  )
}
