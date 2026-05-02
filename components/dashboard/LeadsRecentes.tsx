import { formatarData } from '@/lib/utils'
import { Badge } from '@/components/shared/Badge'
import type { Lead } from '@/types'
import { Users } from 'lucide-react'

interface LeadsRecentesProps {
  leads: Lead[]
}

const TEMP_BADGE: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  quente: 'erro',
  morno:  'aviso',
  frio:   'neutro',
}

const TEMP_LABEL: Record<string, string> = {
  quente: '🔥 Quente',
  morno:  '🌡 Morno',
  frio:   '❄ Frio',
}

export function LeadsRecentes({ leads }: LeadsRecentesProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--cor-texto)' }}>
          Leads recentes
        </h3>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'color-mix(in srgb, var(--cor-primaria) 12%, transparent)', color: 'var(--cor-primaria)' }}
        >
          {leads.length}
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Users size={28} style={{ color: 'var(--cor-borda)' }} />
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Nenhum lead esta semana</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {leads.map(l => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg"
              style={{ background: 'var(--cor-fundo)' }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--cor-texto)' }}>
                  {l.contatos?.nome || '—'}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--cor-texto-suave)' }}>
                  {l.servico} · {formatarData(l.criado_em)}
                </p>
              </div>
              <Badge variant={TEMP_BADGE[l.temperatura] || 'neutro'}>
                {TEMP_LABEL[l.temperatura] || l.temperatura}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
