import type { Metadata } from 'next'
import { ListaNutricao } from '@/components/nutricao/ListaNutricao'

export const metadata: Metadata = {
  title: 'Nutrição | Opus Clínicas',
  description: 'Sequências de mensagens para manter leads em negociação aquecidos',
}

export default function NutricaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--cor-texto)' }}>
          Nutrição de Leads
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
          Sequência de 4 mensagens ao longo de 7 dias para leads em negociação — educacional, prova social, urgência e oferta.
        </p>
      </div>

      <ListaNutricao />
    </div>
  )
}
