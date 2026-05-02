'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Search, X } from 'lucide-react'

const ETAPAS = [
  { id: 'lead',              label: 'Lead' },
  { id: 'consulta_agendada', label: 'Consulta' },
  { id: 'negociacao',        label: 'Negociação' },
  { id: 'procedimento',      label: 'Procedimento' },
  { id: 'pos_venda',         label: 'Pós-venda' },
]

const TEMPERATURAS = [
  { id: 'quente', label: '🔥 Quente' },
  { id: 'morno',  label: '🌡 Morno' },
  { id: 'frio',   label: '❄ Frio' },
]

const STATUS = [
  { id: 'novo',       label: 'Novo' },
  { id: 'em_contato', label: 'Em contato' },
  { id: 'agendado',   label: 'Agendado' },
  { id: 'negociando', label: 'Negociando' },
  { id: 'convertido', label: 'Convertido' },
  { id: 'perdido',    label: 'Perdido' },
]

interface FiltrosLeadsProps {
  filtros: { etapa?: string; temperatura?: string; status?: string; busca?: string }
}

export function FiltrosLeads({ filtros }: FiltrosLeadsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [buscaLocal, setBuscaLocal] = useState(filtros.busca ?? '')

  const setFiltro = useCallback((chave: string, valor: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) { params.set(chave, valor) } else { params.delete(chave) }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const limparFiltros = () => {
    setBuscaLocal('')
    router.push(pathname)
  }

  const temFiltros = filtros.etapa || filtros.temperatura || filtros.status || filtros.busca

  const chipStyle = (ativo: boolean): React.CSSProperties => ({
    background:  ativo ? 'var(--cor-primaria)' : 'var(--cor-card)',
    color:       ativo ? '#fff' : 'var(--cor-texto-suave)',
    borderColor: ativo ? 'var(--cor-primaria)' : 'var(--cor-borda)',
  })

  return (
    <div className="space-y-3">
      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--cor-texto-suave)' }} />
        <input
          type="text"
          value={buscaLocal}
          placeholder="Buscar nome ou telefone…"
          onChange={e => {
            setBuscaLocal(e.target.value)
            if (e.target.value === '') setFiltro('busca', null)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') setFiltro('busca', buscaLocal || null)
          }}
          className="w-full text-sm rounded-lg pl-9 pr-3 py-2.5 outline-none transition-all"
          style={{
            background: 'var(--cor-card)',
            border: '1px solid var(--cor-borda)',
            color: 'var(--cor-texto)',
          }}
        />
      </div>

      {/* Chips de filtro */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ETAPAS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro('etapa', filtros.etapa === f.id ? null : f.id)}
            className="text-xs px-3 py-1.5 rounded-full border transition-all"
            style={chipStyle(filtros.etapa === f.id)}
          >
            {f.label}
          </button>
        ))}

        <span className="w-px h-4 mx-1" style={{ background: 'var(--cor-borda)' }} />

        {TEMPERATURAS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro('temperatura', filtros.temperatura === f.id ? null : f.id)}
            className="text-xs px-3 py-1.5 rounded-full border transition-all"
            style={chipStyle(filtros.temperatura === f.id)}
          >
            {f.label}
          </button>
        ))}

        <span className="w-px h-4 mx-1" style={{ background: 'var(--cor-borda)' }} />

        {STATUS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro('status', filtros.status === f.id ? null : f.id)}
            className="text-xs px-3 py-1.5 rounded-full border transition-all"
            style={chipStyle(filtros.status === f.id)}
          >
            {f.label}
          </button>
        ))}

        {temFiltros && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all ml-1"
            style={{ borderColor: '#EF4444', color: '#EF4444', background: 'rgba(239,68,68,0.06)' }}
          >
            <X size={11} /> Limpar
          </button>
        )}
      </div>
    </div>
  )
}
