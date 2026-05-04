import type { Metadata } from 'next'
import { ListaFollowUp } from '@/components/follow-up/ListaFollowUp'

export const metadata: Metadata = {
  title: 'Follow-up | Opus Clínicas',
  description: 'Acompanhe e gerencie os follow-ups automáticos de leads parados',
}

export default function FollowUpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--cor-texto)' }}>
          Follow-up
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
          Sequências automáticas de 3 tentativas para leads que ficam 2+ dias sem resposta.
        </p>
      </div>

      <ListaFollowUp />
    </div>
  )
}
