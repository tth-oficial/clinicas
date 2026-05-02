'use client'

import { Badge } from '@/components/shared/Badge'
import { formatarMoeda } from '@/lib/utils'
import type { Lead } from '@/types'

type LeadComContato = Lead & { contatos?: { nome: string; telefone: string } }

interface LeadCardProps {
  lead: LeadComContato
  onClick: () => void
}

const TEMP_CONFIG: Record<string, { icon: string; variant: React.ComponentProps<typeof Badge>['variant'] }> = {
  quente: { icon: '🔥', variant: 'erro' },
  morno:  { icon: '🌡', variant: 'aviso' },
  frio:   { icon: '❄',  variant: 'neutro' },
}

function diasNaEtapa(atualizadoEm: string): number {
  return Math.floor((Date.now() - new Date(atualizadoEm).getTime()) / 86_400_000)
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const temp = TEMP_CONFIG[lead.temperatura] ?? TEMP_CONFIG.morno
  const dias = diasNaEtapa(lead.atualizado_em)

  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('lead-id', lead.id)}
      onClick={onClick}
      className="rounded-lg p-3 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all select-none"
      style={{
        background: 'var(--cor-card)',
        border: '1px solid var(--cor-borda)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--cor-texto)' }}>
          {lead.contatos?.nome || 'Sem nome'}
        </p>
        <Badge variant={temp.variant} className="shrink-0 text-xs">{temp.icon}</Badge>
      </div>

      <p className="text-xs mb-2 line-clamp-1" style={{ color: 'var(--cor-texto-suave)' }}>
        {lead.servico}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--cor-primaria)' }}>
          {lead.valor_estimado ? formatarMoeda(lead.valor_estimado) : '—'}
        </span>
        {lead.origem && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)' }}
          >
            {lead.origem}
          </span>
        )}
      </div>

      <p className="text-xs mt-1.5" style={{ color: 'var(--cor-texto-suave)', opacity: 0.65 }}>
        {dias === 0 ? 'Hoje' : dias === 1 ? '1 dia nesta etapa' : `${dias} dias nesta etapa`}
      </p>
    </div>
  )
}
