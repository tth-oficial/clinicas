import type { Metadata } from 'next'
import { CalendarioAgendamento } from '@/components/agendamento/CalendarioAgendamento'

export const metadata: Metadata = {
  title: 'Agendamento | Opus Clínicas',
  description: 'Calendário de agendamentos com confirmações automáticas via WhatsApp',
}

export default function AgendamentoPage() {
  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header da página */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--cor-texto)' }}>
            Agendamento
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
            Gerencie consultas e procedimentos. Confirmações automáticas via WhatsApp.
          </p>
        </div>
      </div>

      {/* Calendário */}
      <div className="flex-1 min-h-0">
        <CalendarioAgendamento />
      </div>
    </div>
  )
}
