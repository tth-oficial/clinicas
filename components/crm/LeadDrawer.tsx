'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Phone, Calendar, Edit3, Check } from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { formatarMoeda, formatarData, formatarHora } from '@/lib/utils'
import { toast } from 'sonner'
import type { Lead, Agendamento, LeadEtapa } from '@/types'

type LeadComContato = Lead & {
  contatos?: { nome: string; telefone: string; email?: string | null }
}

interface LeadDrawerProps {
  lead: LeadComContato
  onClose: () => void
  onAtualizar: (lead: Lead) => void
}

const ETAPAS: { id: LeadEtapa; label: string }[] = [
  { id: 'lead',              label: 'Lead' },
  { id: 'consulta_agendada', label: 'Consulta Agendada' },
  { id: 'negociacao',        label: 'Em Negociação' },
  { id: 'procedimento',      label: 'Procedimento' },
  { id: 'pos_venda',         label: 'Pós-venda' },
]

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  agendado: 'primario', confirmado: 'destaque', realizado: 'destaque',
  no_show: 'erro', cancelado: 'neutro', remarcado: 'aviso',
}

export function LeadDrawer({ lead, onClose, onAtualizar }: LeadDrawerProps) {
  const [notas, setNotas] = useState(lead.notas ?? '')
  const [salvandoNotas, setSalvandoNotas] = useState(false)
  const [notasSalvas, setNotasSalvas] = useState(true)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [movendo, setMovendo] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/leads/${lead.id}`)
      .then(r => r.json())
      .then(json => { if (json.data?.agendamentos) setAgendamentos(json.data.agendamentos) })
      .catch(() => {})
  }, [lead.id])

  useEffect(() => {
    const notasOriginais = lead.notas ?? ''
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (notas === notasOriginais) { setNotasSalvas(true); return }
    setNotasSalvas(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSalvandoNotas(true)
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas }),
      })
      setSalvandoNotas(false)
      if (res.ok) {
        const json = await res.json()
        onAtualizar(json.data)
        setNotasSalvas(true)
      }
    }, 1000)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [notas]) // eslint-disable-line react-hooks/exhaustive-deps

  const moverEtapa = async (etapa: LeadEtapa) => {
    if (etapa === lead.etapa || movendo) return
    setMovendo(true)
    const res = await fetch(`/api/leads/${lead.id}/etapa`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa }),
    })
    setMovendo(false)
    if (res.ok) {
      const json = await res.json()
      onAtualizar(json.data)
      toast.success('Etapa atualizada')
    } else {
      toast.error('Erro ao atualizar etapa')
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col"
        style={{ background: 'var(--cor-card)', boxShadow: '-4px 0 32px rgba(0,0,0,0.14)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--cor-borda)' }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate" style={{ color: 'var(--cor-texto)' }}>
              {lead.contatos?.nome ?? 'Lead'}
            </h2>
            <p className="text-xs truncate" style={{ color: 'var(--cor-texto-suave)' }}>
              {lead.servico}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 rounded-lg shrink-0 hover:opacity-70 transition-opacity"
            style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)' }}
          >
            <X size={15} style={{ color: 'var(--cor-texto-suave)' }} />
          </button>
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto">

          {/* Contato */}
          <div className="px-5 py-4 space-y-2" style={{ borderBottom: '1px solid var(--cor-borda)' }}>
            <div className="flex items-center gap-2">
              <Phone size={13} style={{ color: 'var(--cor-texto-suave)' }} />
              <span className="text-sm" style={{ color: 'var(--cor-texto)' }}>
                {lead.contatos?.telefone ?? '—'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lead.valor_estimado != null && (
                <span
                  className="text-sm font-semibold px-2.5 py-1 rounded-lg"
                  style={{
                    background: 'color-mix(in srgb, var(--cor-primaria) 12%, transparent)',
                    color: 'var(--cor-primaria)',
                  }}
                >
                  {formatarMoeda(lead.valor_estimado)}
                </span>
              )}
              {lead.origem && (
                <span
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)' }}
                >
                  {lead.origem}
                </span>
              )}
            </div>
          </div>

          {/* Mover etapa */}
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cor-borda)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--cor-texto-suave)' }}>
              Etapa
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ETAPAS.map(e => (
                <button
                  key={e.id}
                  onClick={() => moverEtapa(e.id)}
                  disabled={movendo}
                  className="text-xs px-2.5 py-1 rounded-lg border transition-all disabled:opacity-50"
                  style={{
                    background:   lead.etapa === e.id ? 'var(--cor-primaria)' : 'transparent',
                    color:        lead.etapa === e.id ? '#fff' : 'var(--cor-texto-suave)',
                    borderColor:  lead.etapa === e.id ? 'var(--cor-primaria)' : 'var(--cor-borda)',
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cor-borda)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--cor-texto-suave)' }}>
                <Edit3 size={11} /> Notas
              </p>
              {salvandoNotas && (
                <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>Salvando…</span>
              )}
              {!salvandoNotas && notasSalvas && notas !== '' && (
                <Check size={13} style={{ color: '#22C55E' }} />
              )}
            </div>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Adicione notas sobre este lead…"
              rows={4}
              className="w-full text-sm resize-none rounded-lg p-3 outline-none transition-all"
              style={{
                background:  'var(--cor-fundo)',
                border:      '1px solid var(--cor-borda)',
                color:       'var(--cor-texto)',
              }}
            />
          </div>

          {/* Agendamentos */}
          {agendamentos.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1" style={{ color: 'var(--cor-texto-suave)' }}>
                <Calendar size={11} /> Agendamentos
              </p>
              <div className="space-y-2">
                {agendamentos.map(ag => (
                  <div
                    key={ag.id}
                    className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>{ag.servico}</p>
                      <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
                        {formatarData(ag.data_hora)} às {formatarHora(ag.data_hora)}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE[ag.status] ?? 'neutro'}>{ag.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
