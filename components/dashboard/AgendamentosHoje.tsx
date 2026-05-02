import { formatarHora } from '@/lib/utils'
import { Badge } from '@/components/shared/Badge'
import type { Agendamento } from '@/types'
import { Calendar } from 'lucide-react'

interface AgendamentosHojeProps {
  agendamentos: Agendamento[]
}

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  agendado:   'neutro',
  confirmado: 'primario',
  realizado:  'destaque',
  no_show:    'erro',
  cancelado:  'erro',
  remarcado:  'aviso',
}

const STATUS_LABEL: Record<string, string> = {
  agendado:   'Agendado',
  confirmado: 'Confirmado',
  realizado:  'Realizado',
  no_show:    'No-show',
  cancelado:  'Cancelado',
  remarcado:  'Remarcado',
}

export function AgendamentosHoje({ agendamentos }: AgendamentosHojeProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--cor-texto)' }}>
          Agendamentos de hoje
        </h3>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'color-mix(in srgb, var(--cor-primaria) 12%, transparent)', color: 'var(--cor-primaria)' }}
        >
          {agendamentos.length}
        </span>
      </div>

      {agendamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Calendar size={28} style={{ color: 'var(--cor-borda)' }} />
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Nenhum agendamento hoje</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {agendamentos.map(a => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg"
              style={{ background: 'var(--cor-fundo)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono font-medium tabular-nums" style={{ color: 'var(--cor-texto-suave)' }}>
                  {formatarHora(a.data_hora)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--cor-texto)' }}>
                    {a.contatos?.nome || '—'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--cor-texto-suave)' }}>
                    {a.servico}
                  </p>
                </div>
              </div>
              <Badge variant={STATUS_BADGE[a.status] || 'neutro'}>
                {STATUS_LABEL[a.status] || a.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
