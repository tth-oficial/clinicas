'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadEtapa, LeadTemperatura, LeadStatus } from '@/types'

export interface FiltrosLeads {
  etapa?: LeadEtapa
  temperatura?: LeadTemperatura
  status?: LeadStatus
  busca?: string
  page?: number
  limit?: number
}

export function useLeads(filtros: FiltrosLeads = {}) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtros.etapa)       params.set('etapa', filtros.etapa)
    if (filtros.temperatura) params.set('temperatura', filtros.temperatura)
    if (filtros.status)      params.set('status', filtros.status)
    if (filtros.busca)       params.set('busca', filtros.busca)
    params.set('page',  String(filtros.page  ?? 1))
    params.set('limit', String(filtros.limit ?? 20))

    try {
      const res = await fetch(`/api/leads?${params}`)
      if (!res.ok) throw new Error('Erro ao buscar leads')
      const json = await res.json()
      setLeads(json.data ?? [])
      setTotal(json.count ?? 0)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.etapa, filtros.temperatura, filtros.status, filtros.busca, filtros.page, filtros.limit])

  // eslint-disable-next-line
  useEffect(() => { void fetchLeads() }, [fetchLeads])

  // Realtime: atualiza kanban quando outro usuário move um card
  const fetchRef = useRef(fetchLeads)
  useEffect(() => { fetchRef.current = fetchLeads }, [fetchLeads])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchRef.current()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return { leads, total, loading, error, refetch: fetchLeads }
}

export function useLead(id: string) {
  const [lead, setLead] = useState<(Lead & { agendamentos?: unknown[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLead = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${id}`)
      if (!res.ok) throw new Error('Lead não encontrado')
      const json = await res.json()
      setLead(json.data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [id])

  // eslint-disable-next-line
  useEffect(() => { void fetchLead() }, [fetchLead])

  return { lead, loading, error, refetch: fetchLead }
}

export function useMoverLead() {
  const [loading, setLoading] = useState(false)

  const mover = async (leadId: string, etapa: LeadEtapa): Promise<boolean> => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/etapa`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa }),
      })
      return res.ok
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }

  return { mover, loading }
}

export function useAtualizarLead() {
  const [loading, setLoading] = useState(false)

  const atualizar = async (leadId: string, dados: Partial<Lead>): Promise<Lead | null> => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.data
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }

  return { atualizar, loading }
}
