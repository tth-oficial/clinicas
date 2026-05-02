import type { Metadata } from 'next'
import { ListaAntiNoShow } from '@/components/anti-no-show/ListaAntiNoShow'

export const metadata: Metadata = {
  title: 'Anti No-Show | Opus Clínicas',
  description: 'Cadências automáticas de confirmação para reduzir faltas',
}

export default function AntiNoShowPage() {
  return (
    <div className="space-y-6">
      {/* Header da página */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--cor-texto)' }}>
          Anti No-Show
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
          Cadências automáticas de confirmação via WhatsApp — 48h, 24h e 2h antes de cada consulta.
        </p>
      </div>

      {/* Lista */}
      <ListaAntiNoShow />
    </div>
  )
}
