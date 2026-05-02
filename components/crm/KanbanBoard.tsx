'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadCard } from './LeadCard'
import { LeadDrawer } from './LeadDrawer'
import { formatarMoeda } from '@/lib/utils'
import { toast } from 'sonner'
import type { Lead, LeadEtapa } from '@/types'

const ETAPAS: { id: LeadEtapa; label: string; cor: string }[] = [
  { id: 'lead',              label: 'Lead',              cor: '#4B5563' },
  { id: 'consulta_agendada', label: 'Consulta Agendada', cor: '#1D4ED8' },
  { id: 'negociacao',        label: 'Em Negociação',     cor: '#D97706' },
  { id: 'procedimento',      label: 'Procedimento',      cor: '#2D8B73' },
  { id: 'pos_venda',         label: 'Pós-venda',         cor: '#7C3AED' },
]

type LeadComContato = Lead & { contatos?: { id: string; nome: string; telefone: string } }

interface KanbanBoardProps {
  leadsIniciais: LeadComContato[]
}

export function KanbanBoard({ leadsIniciais }: KanbanBoardProps) {
  const [leads, setLeads] = useState<LeadComContato[]>(leadsIniciais)
  const [draggingOver, setDraggingOver] = useState<LeadEtapa | null>(null)
  const [leadAberto, setLeadAberto] = useState<LeadComContato | null>(null)

  // Realtime: atualiza kanban quando outro usuário move um card
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('kanban-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        payload => {
          setLeads(prev =>
            prev.map(l => l.id === payload.new.id ? { ...l, ...(payload.new as Partial<Lead>) } : l)
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const leadsPorEtapa = (etapa: LeadEtapa) =>
    leads.filter(l => l.etapa === etapa && l.status !== 'perdido')

  const somaEtapa = (etapa: LeadEtapa) =>
    leadsPorEtapa(etapa).reduce((s, l) => s + (l.valor_estimado ?? 0), 0)

  const handleDrop = useCallback(async (e: React.DragEvent, destino: LeadEtapa) => {
    e.preventDefault()
    setDraggingOver(null)
    const leadId = e.dataTransfer.getData('lead-id')
    if (!leadId) return

    const leadAtual = leads.find(l => l.id === leadId)
    if (!leadAtual || leadAtual.etapa === destino) return

    // Atualização otimista
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, etapa: destino } : l))

    const res = await fetch(`/api/leads/${leadId}/etapa`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: destino }),
    })

    if (!res.ok) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, etapa: leadAtual.etapa } : l))
      toast.error('Erro ao mover lead')
    }
  }, [leads])

  const handleLeadAtualizado = useCallback((leadAtualizado: Lead) => {
    setLeads(prev => prev.map(l => l.id === leadAtualizado.id ? { ...l, ...leadAtualizado } : l))
    setLeadAberto(prev => prev?.id === leadAtualizado.id ? { ...prev, ...leadAtualizado } : prev)
  }, [])

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {ETAPAS.map(etapa => {
          const etapaLeads = leadsPorEtapa(etapa.id)
          const soma = somaEtapa(etapa.id)
          const isDraggingOver = draggingOver === etapa.id

          return (
            <div
              key={etapa.id}
              className="flex flex-col shrink-0 w-72 rounded-xl overflow-hidden"
              style={{
                background:   'var(--cor-fundo)',
                border:       isDraggingOver ? `2px solid ${etapa.cor}` : '1px solid var(--cor-borda)',
                transition:   'border-color 0.15s',
              }}
              onDragOver={e => { e.preventDefault(); setDraggingOver(etapa.id) }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingOver(null)
              }}
              onDrop={e => handleDrop(e, etapa.id)}
            >
              {/* Cabeçalho da coluna */}
              <div className="px-3 pt-3 pb-2.5" style={{ borderBottom: `2px solid ${etapa.cor}` }}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: etapa.cor }}>
                    {etapa.label}
                  </span>
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${etapa.cor}20`, color: etapa.cor }}
                  >
                    {etapaLeads.length}
                  </span>
                </div>
                {soma > 0 && (
                  <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
                    {formatarMoeda(soma)}
                  </p>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {etapaLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => setLeadAberto(lead)}
                  />
                ))}
                {etapaLeads.length === 0 && (
                  <div
                    className="flex items-center justify-center h-16 rounded-lg border-2 border-dashed text-xs"
                    style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto-suave)' }}
                  >
                    Arraste aqui
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {leadAberto && (
        <LeadDrawer
          lead={leadAberto}
          onClose={() => setLeadAberto(null)}
          onAtualizar={handleLeadAtualizado}
        />
      )}
    </>
  )
}
