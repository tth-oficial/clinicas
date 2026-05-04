import type { Metadata } from 'next'
import { PainelReaquecimento } from '@/components/reaquecimento/PainelReaquecimento'

export const metadata: Metadata = {
  title: 'Reaquecimento | Opus Clínicas',
  description: 'Campanhas manuais para reativar contatos inativos via WhatsApp',
}

export default function ReaquecimentoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--cor-texto)' }}>
          Reaquecimento de Base
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
          Campanhas manuais para reativar contatos inativos. Envio em lotes de 20/hora para evitar bloqueio do WhatsApp.
        </p>
      </div>

      <PainelReaquecimento />
    </div>
  )
}
