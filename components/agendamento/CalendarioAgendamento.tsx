'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Clock,
  User, Stethoscope, CheckCircle2, XCircle, AlertCircle,
  MoreHorizontal, RefreshCw,
} from 'lucide-react'
import type { Agendamento } from '@/types'
import { ModalAgendamento } from '@/components/agendamento/ModalAgendamento'

// ─── Utilitários ─────────────────────────────────────────────
const STATUS_CONFIG = {
  agendado:   { label: 'Agendado',   cor: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  confirmado: { label: 'Confirmado', cor: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  realizado:  { label: 'Realizado',  cor: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  no_show:    { label: 'No-show',    cor: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  cancelado:  { label: 'Cancelado',  cor: '#9CA3AF', bg: 'rgba(156,163,175,0.12)'},
  remarcado:  { label: 'Remarcado',  cor: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
} as const

type StatusKey = keyof typeof STATUS_CONFIG

function formatarHora(dataHora: string) {
  return new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarData(data: Date) {
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Gera slots de 08h a 20h de 30 em 30 min
const SLOTS_HORA = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

// ─── Bloco de agendamento na timeline ────────────────────────
function BlocoAgendamento({
  agendamento,
  onStatusChange,
}: {
  agendamento: Agendamento
  onStatusChange: (id: string, status: string) => void
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  const cfg = STATUS_CONFIG[agendamento.status as StatusKey] ?? STATUS_CONFIG.agendado
  const contato = agendamento.contatos

  const proximos: StatusKey[] = agendamento.status === 'agendado'
    ? ['confirmado', 'realizado', 'no_show', 'cancelado']
    : agendamento.status === 'confirmado'
    ? ['realizado', 'no_show', 'cancelado']
    : []

  return (
    <div
      className="rounded-xl p-3 group relative cursor-pointer transition-all hover:shadow-md"
      style={{ background: cfg.bg, border: `1px solid ${cfg.cor}30` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: cfg.cor }}
            />
            <span className="text-xs font-bold truncate" style={{ color: 'var(--cor-texto)' }}>
              {contato?.nome ?? 'Paciente'}
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--cor-texto-suave)' }}>
            <Stethoscope size={10} className="inline mr-1" />
            {agendamento.servico}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
              <Clock size={10} className="inline mr-0.5" />
              {formatarHora(agendamento.data_hora)} · {agendamento.duracao_minutos}min
            </span>
            {agendamento.profissional && (
              <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
                <User size={10} className="inline mr-0.5" />
                {agendamento.profissional}
              </span>
            )}
          </div>
        </div>

        {proximos.length > 0 && (
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuAberto(!menuAberto) }}
              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.05)' }}
            >
              <MoreHorizontal size={14} style={{ color: 'var(--cor-texto-suave)' }} />
            </button>
            {menuAberto && (
              <div
                className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
              >
                {proximos.map(s => (
                  <button
                    key={s}
                    onClick={() => { onStatusChange(agendamento.id, s); setMenuAberto(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-black/5 text-left"
                    style={{ color: STATUS_CONFIG[s].cor }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: STATUS_CONFIG[s].cor }} />
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Badge de status */}
      <div className="mt-2">
        <span
          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.cor, border: `1px solid ${cfg.cor}40` }}
        >
          {cfg.label}
        </span>
        {agendamento.valor && (
          <span className="ml-2 text-xs font-bold" style={{ color: 'var(--cor-destaque)' }}>
            R$ {agendamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Vista do Dia ────────────────────────────────────────────
function VistaDia({
  data,
  agendamentos,
  onStatusChange,
  onNovoHorario,
}: {
  data: Date
  agendamentos: Agendamento[]
  onStatusChange: (id: string, status: string) => void
  onNovoHorario: (hora: string) => void
}) {
  const agendamentoPorHora = (slot: string) => {
    return agendamentos.filter(ag => {
      const h = new Date(ag.data_hora)
      const hStr = `${String(h.getHours()).padStart(2, '0')}:${String(h.getMinutes()).padStart(2, '0')}`
      return hStr === slot
    })
  }

  const agora = new Date()
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  const ehHoje = data.toDateString() === agora.toDateString()

  return (
    <div className="flex-1 overflow-y-auto">
      {SLOTS_HORA.map(slot => {
        const ags = agendamentoPorHora(slot)
        const isAtual = ehHoje && slot <= horaAtual && horaAtual < (SLOTS_HORA[SLOTS_HORA.indexOf(slot) + 1] ?? '21:00')

        return (
          <div
            key={slot}
            className="flex gap-3 group/slot hover:bg-black/2 transition-colors min-h-[64px]"
            style={{ borderBottom: '1px solid var(--cor-borda)' }}
          >
            {/* Coluna de hora */}
            <div className="w-14 flex-shrink-0 flex items-start pt-2 px-2">
              <span
                className="text-xs font-mono"
                style={{ color: isAtual ? 'var(--cor-destaque)' : 'var(--cor-texto-suave)', fontWeight: isAtual ? 700 : 400 }}
              >
                {slot}
              </span>
            </div>

            {/* Linha */}
            <div className="w-px self-stretch my-2" style={{ background: isAtual ? 'var(--cor-destaque)' : 'var(--cor-borda)' }} />

            {/* Conteúdo */}
            <div className="flex-1 py-1.5 pr-3 space-y-1.5">
              {ags.map(ag => (
                <BlocoAgendamento key={ag.id} agendamento={ag} onStatusChange={onStatusChange} />
              ))}
              {ags.length === 0 && (
                <button
                  onClick={() => onNovoHorario(slot)}
                  className="w-full h-10 rounded-lg text-xs opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-center gap-1"
                  style={{ border: '1px dashed var(--cor-borda)', color: 'var(--cor-texto-suave)' }}
                >
                  <Plus size={12} />
                  Agendar aqui
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Mini Calendário ─────────────────────────────────────────
function MiniCalendario({
  dataSelecionada,
  onSelecionar,
}: {
  dataSelecionada: Date
  onSelecionar: (d: Date) => void
}) {
  const [mes, setMes] = useState(new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth(), 1))

  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const primeiroDia = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay()
  const hoje = new Date()

  const dias = Array.from({ length: primeiroDia + diasNoMes }, (_, i) => {
    if (i < primeiroDia) return null
    return new Date(mes.getFullYear(), mes.getMonth(), i - primeiroDia + 1)
  })

  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold" style={{ color: 'var(--cor-texto)' }}>
          {mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors">
            <ChevronLeft size={14} style={{ color: 'var(--cor-texto-suave)' }} />
          </button>
          <button onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors">
            <ChevronRight size={14} style={{ color: 'var(--cor-texto-suave)' }} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <span key={i} className="text-center text-xs font-medium py-1" style={{ color: 'var(--cor-texto-suave)' }}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {dias.map((d, i) => {
          if (!d) return <div key={i} />
          const eSelecionado = d.toDateString() === dataSelecionada.toDateString()
          const eHoje = d.toDateString() === hoje.toDateString()
          return (
            <button
              key={i}
              onClick={() => { onSelecionar(d) }}
              className="aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all"
              style={{
                background: eSelecionado ? 'var(--cor-destaque)' : eHoje ? 'rgba(0,0,0,0.05)' : 'transparent',
                color: eSelecionado ? '#fff' : eHoje ? 'var(--cor-destaque)' : 'var(--cor-texto)',
                fontWeight: eHoje || eSelecionado ? 700 : 400,
              }}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Resumo do Dia ───────────────────────────────────────────
function ResumoDia({ agendamentos }: { agendamentos: Agendamento[] }) {
  const total = agendamentos.length
  const confirmados = agendamentos.filter(a => a.status === 'confirmado').length
  const realizados = agendamentos.filter(a => a.status === 'realizado').length
  const noshow = agendamentos.filter(a => a.status === 'no_show').length
  const receita = agendamentos
    .filter(a => a.status === 'realizado' && a.valor)
    .reduce((s, a) => s + (a.valor ?? 0), 0)

  return (
    <div className="space-y-2">
      {[
        { label: 'Total', valor: total, icon: <Calendar size={13} />, cor: 'var(--cor-destaque)' },
        { label: 'Confirmados', valor: confirmados, icon: <CheckCircle2 size={13} />, cor: '#22C55E' },
        { label: 'Realizados', valor: realizados, icon: <CheckCircle2 size={13} />, cor: '#6366F1' },
        { label: 'No-show', valor: noshow, icon: <XCircle size={13} />, cor: '#EF4444' },
      ].map(item => (
        <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--cor-fundo)' }}>
          <div className="flex items-center gap-2" style={{ color: item.cor }}>
            {item.icon}
            <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{item.label}</span>
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--cor-texto)' }}>{item.valor}</span>
        </div>
      ))}
      {receita > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <span className="text-xs font-medium" style={{ color: '#22C55E' }}>💰 Receita do dia</span>
          <span className="text-sm font-bold" style={{ color: '#22C55E' }}>
            R$ {receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Componente Principal ────────────────────────────────────
export function CalendarioAgendamento() {
  const [dataAtual, setDataAtual] = useState(new Date())
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [horaInicial, setHoraInicial] = useState<string | undefined>()

  const carregarAgendamentos = useCallback(async (data: Date) => {
    setCarregando(true)
    try {
      const dataStr = data.toISOString().split('T')[0]
      const res = await fetch(`/api/agendamentos?data=${dataStr}&vista=dia`)
      const json = await res.json() as { agendamentos: Agendamento[] }
      setAgendamentos(json.agendamentos ?? [])
    } catch {
      setAgendamentos([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregarAgendamentos(dataAtual)
  }, [dataAtual, carregarAgendamentos])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      void carregarAgendamentos(dataAtual)
    } catch {
      // silent
    }
  }

  const handleNovoHorario = (hora: string) => {
    setHoraInicial(hora)
    setModalAberto(true)
  }

  const handleSalvo = () => {
    setModalAberto(false)
    void carregarAgendamentos(dataAtual)
  }

  const irParaHoje = () => setDataAtual(new Date())
  const diaAnterior = () => setDataAtual(d => { const nd = new Date(d); nd.setDate(nd.getDate() - 1); return nd })
  const proximoDia = () => setDataAtual(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 1); return nd })

  return (
    <div className="flex gap-5 h-full min-h-0">
      {/* Coluna lateral */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        <MiniCalendario dataSelecionada={dataAtual} onSelecionar={setDataAtual} />

        <div className="p-4 rounded-2xl" style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--cor-texto)' }}>Resumo do dia</h3>
          {carregando ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--cor-fundo)' }} />
              ))}
            </div>
          ) : (
            <ResumoDia agendamentos={agendamentos} />
          )}
        </div>

        {/* Legenda */}
        <div className="p-4 rounded-2xl" style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}>
          <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--cor-texto-suave)' }}>LEGENDA</h3>
          <div className="space-y-1.5">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.cor }} />
                <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna principal */}
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden" style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}>
        {/* Header do calendário */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--cor-borda)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={diaAnterior}
                className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                aria-label="Dia anterior"
              >
                <ChevronLeft size={16} style={{ color: 'var(--cor-texto-suave)' }} />
              </button>
              <button
                onClick={proximoDia}
                className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                aria-label="Próximo dia"
              >
                <ChevronRight size={16} style={{ color: 'var(--cor-texto-suave)' }} />
              </button>
            </div>

            <div>
              <h2 className="text-base font-bold capitalize" style={{ color: 'var(--cor-texto)' }}>
                {formatarData(dataAtual)}
              </h2>
              {dataAtual.toDateString() === new Date().toDateString() && (
                <span className="text-xs" style={{ color: 'var(--cor-destaque)' }}>Hoje</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={irParaHoje}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto)', border: '1px solid var(--cor-borda)' }}
            >
              Hoje
            </button>
            <button
              onClick={() => void carregarAgendamentos(dataAtual)}
              className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Atualizar"
            >
              <RefreshCw size={14} style={{ color: 'var(--cor-texto-suave)' }} className={carregando ? 'animate-spin' : ''} />
            </button>
            <button
              id="btn-novo-agendamento"
              onClick={() => { setHoraInicial(undefined); setModalAberto(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'var(--cor-destaque)', color: '#fff' }}
            >
              <Plus size={16} />
              Novo agendamento
            </button>
          </div>
        </div>

        {/* Timeline */}
        {carregando ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--cor-destaque)' }} />
              <span className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Carregando agenda...</span>
            </div>
          </div>
        ) : (
          <VistaDia
            data={dataAtual}
            agendamentos={agendamentos}
            onStatusChange={handleStatusChange}
            onNovoHorario={handleNovoHorario}
          />
        )}
      </div>

      {/* Modal */}
      <ModalAgendamento
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvo={handleSalvo}
        dataInicial={dataAtual.toISOString().split('T')[0]}
        horaInicial={horaInicial}
      />
    </div>
  )
}
