'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BellRing, CheckCircle2, Clock, MessageSquare,
  RefreshCw, Send, Calendar, User, ChevronDown, ChevronUp,
  AlertTriangle,
} from 'lucide-react'

interface EtapaCadencia {
  id: string
  numero: number
  mensagem_template: string
  status: 'pendente' | 'enviado' | 'sem_resposta' | 'respondido'
  enviado_em: string | null
  resposta_recebida: string | null
}

interface CadenciaComDetalhes {
  id: string
  clinica_id: string
  contato_id: string
  etapa_atual: number
  total_etapas: number
  status: 'ativa' | 'pausada' | 'concluida' | 'cancelada'
  proxima_execucao: string | null
  criado_em: string
  agendamentos: {
    id: string
    servico: string
    data_hora: string
    status: string
    profissional: string | null
  } | null
  contatos: {
    id: string
    nome: string
    telefone: string
  } | null
  cadencia_etapas: EtapaCadencia[]
}

const STATUS_ETAPA_CONFIG = {
  pendente:     { label: 'Pendente',    icon: <Clock size={13} />,         cor: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  enviado:      { label: 'Enviado',     icon: <CheckCircle2 size={13} />,  cor: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  sem_resposta: { label: 'Sem resposta',icon: <AlertTriangle size={13} />, cor: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
  respondido:   { label: 'Respondido',  icon: <MessageSquare size={13} />, cor: '#22C55E', bg: 'rgba(34,197,94,0.1)'  },
}

function formatarDataHora(dt: string) {
  return new Date(dt).toLocaleString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function ProgressoEtapas({ etapas, total }: { etapas: EtapaCadencia[]; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const etapa = etapas.find(e => e.numero === i + 1)
        const st = etapa?.status ?? 'pendente'
        const cfg = STATUS_ETAPA_CONFIG[st]
        return (
          <div
            key={i}
            title={`Etapa ${i + 1}: ${cfg.label}`}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white"
            style={{ background: cfg.cor, fontSize: 10, fontWeight: 700 }}
          >
            {i + 1}
          </div>
        )
      })}
    </div>
  )
}

function CardCadencia({
  cadencia,
  onEnviarAgora,
  enviando,
}: {
  cadencia: CadenciaComDetalhes
  onEnviarAgora: (cadenciaId: string) => void
  enviando: string | null
}) {
  const [expandido, setExpandido] = useState(false)
  const agendamento = cadencia.agendamentos
  const contato = cadencia.contatos
  const etapaAtualNum = cadencia.etapa_atual + 1
  const proximaEtapa = cadencia.cadencia_etapas.find(e => e.numero === etapaAtualNum && e.status === 'pendente')

  const statusCor = {
    ativa:    '#22C55E',
    pausada:  '#F59E0B',
    concluida:'#6366F1',
    cancelada:'#9CA3AF',
  }[cadencia.status] ?? '#9CA3AF'

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      {/* Header do card */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ background: 'var(--cor-destaque)' }}
            >
              {contato?.nome?.charAt(0)?.toUpperCase() ?? '?'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm" style={{ color: 'var(--cor-texto)' }}>
                  {contato?.nome ?? 'Contato'}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: `${statusCor}18`, color: statusCor }}
                >
                  {cadencia.status === 'ativa' ? 'Ativa' : cadencia.status === 'concluida' ? 'Concluída' : cadencia.status === 'cancelada' ? 'Cancelada' : 'Pausada'}
                </span>
              </div>

              <p className="text-xs mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
                <User size={11} className="inline mr-1" />
                {contato?.telefone}
              </p>

              {agendamento && (
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--cor-texto-suave)' }}>
                    <Calendar size={11} />
                    {formatarDataHora(agendamento.data_hora)}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--cor-destaque)' }}>
                    {agendamento.servico}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ProgressoEtapas etapas={cadencia.cadencia_etapas} total={cadencia.total_etapas} />

            {cadencia.status === 'ativa' && proximaEtapa && (
              <button
                onClick={() => onEnviarAgora(cadencia.id)}
                disabled={enviando === cadencia.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--cor-destaque)', color: '#fff' }}
                title="Enviar etapa agora"
              >
                <Send size={12} />
                {enviando === cadencia.id ? 'Enviando...' : 'Enviar agora'}
              </button>
            )}

            <button
              onClick={() => setExpandido(!expandido)}
              className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            >
              {expandido ? <ChevronUp size={16} style={{ color: 'var(--cor-texto-suave)' }} /> : <ChevronDown size={16} style={{ color: 'var(--cor-texto-suave)' }} />}
            </button>
          </div>
        </div>

        {/* Próxima execução */}
        {cadencia.status === 'ativa' && cadencia.proxima_execucao && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Clock size={12} style={{ color: '#F59E0B' }} />
            <span className="text-xs" style={{ color: '#F59E0B' }}>
              Próximo envio: {formatarDataHora(cadencia.proxima_execucao)}
            </span>
          </div>
        )}
      </div>

      {/* Etapas expandidas */}
      {expandido && (
        <div className="border-t px-4 pb-4 space-y-2" style={{ borderColor: 'var(--cor-borda)' }}>
          <p className="text-xs font-bold pt-3 mb-2" style={{ color: 'var(--cor-texto-suave)' }}>
            ETAPAS DA CADÊNCIA
          </p>
          {cadencia.cadencia_etapas
            .sort((a, b) => a.numero - b.numero)
            .map(etapa => {
              const cfg = STATUS_ETAPA_CONFIG[etapa.status]
              return (
                <div
                  key={etapa.id}
                  className="p-3 rounded-xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.cor}30` }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2" style={{ color: cfg.cor }}>
                      {cfg.icon}
                      <span className="text-xs font-bold">Etapa {etapa.numero}</span>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${cfg.cor}20`, color: cfg.cor }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--cor-texto)' }}>
                    {etapa.mensagem_template}
                  </p>
                  {etapa.enviado_em && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--cor-texto-suave)' }}>
                      ✓ Enviado em {formatarDataHora(etapa.enviado_em)}
                    </p>
                  )}
                  {etapa.resposta_recebida && (
                    <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)' }}>
                      <p className="text-xs" style={{ color: '#22C55E' }}>
                        💬 Resposta: &ldquo;{etapa.resposta_recebida}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ─── KPIs Anti No-Show ────────────────────────────────────────
function KPIsAntiNoShow({ cadencias }: { cadencias: CadenciaComDetalhes[] }) {
  const ativas = cadencias.filter(c => c.status === 'ativa').length
  const concluidas = cadencias.filter(c => c.status === 'concluida').length
  const responderam = cadencias.flatMap(c => c.cadencia_etapas).filter(e => e.status === 'respondido').length
  const enviadas = cadencias.flatMap(c => c.cadencia_etapas).filter(e => e.status === 'enviado').length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Cadências ativas', valor: ativas, icon: '🔔', cor: '#22C55E' },
        { label: 'Concluídas', valor: concluidas, icon: '✅', cor: '#6366F1' },
        { label: 'Mensagens enviadas', valor: enviadas, icon: '📤', cor: 'var(--cor-destaque)' },
        { label: 'Respostas recebidas', valor: responderam, icon: '💬', cor: '#F59E0B' },
      ].map(kpi => (
        <div
          key={kpi.label}
          className="p-4 rounded-2xl"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{kpi.icon}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--cor-texto-suave)' }}>{kpi.label}</span>
          </div>
          <span className="text-3xl font-black" style={{ color: kpi.cor }}>{kpi.valor}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────
export function ListaAntiNoShow() {
  const [cadencias, setCadencias] = useState<CadenciaComDetalhes[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'ativa' | 'concluida' | 'cancelada'>('ativa')
  const [enviando, setEnviando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/anti-noshow')
      const json = await res.json() as { cadencias: CadenciaComDetalhes[] }
      setCadencias(json.cadencias ?? [])
    } catch {
      setCadencias([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const handleEnviarAgora = async (cadenciaId: string) => {
    setEnviando(cadenciaId)
    try {
      await fetch('/api/anti-noshow/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadencia_id: cadenciaId }),
      })
      void carregar()
    } finally {
      setEnviando(null)
    }
  }

  const cadenciasFiltradas = filtro === 'todas'
    ? cadencias
    : cadencias.filter(c => c.status === filtro)

  const FILTROS = [
    { key: 'todas', label: 'Todas', count: cadencias.length },
    { key: 'ativa', label: 'Ativas', count: cadencias.filter(c => c.status === 'ativa').length },
    { key: 'concluida', label: 'Concluídas', count: cadencias.filter(c => c.status === 'concluida').length },
    { key: 'cancelada', label: 'Canceladas', count: cadencias.filter(c => c.status === 'cancelada').length },
  ] as const

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <KPIsAntiNoShow cadencias={cadencias} />

      {/* Header e filtros */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 p-1 rounded-xl" style={{ background: 'var(--cor-fundo)' }}>
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: filtro === f.key ? 'var(--cor-card)' : 'transparent',
                color: filtro === f.key ? 'var(--cor-texto)' : 'var(--cor-texto-suave)',
                boxShadow: filtro === f.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {f.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-xs"
                style={{
                  background: filtro === f.key ? 'var(--cor-destaque)' : 'var(--cor-borda)',
                  color: filtro === f.key ? '#fff' : 'var(--cor-texto-suave)',
                }}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => void carregar()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors"
          style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)', border: '1px solid var(--cor-borda)' }}
        >
          <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Lista de cadências */}
      {carregando ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-28 rounded-2xl animate-pulse"
              style={{ background: 'var(--cor-card)' }}
            />
          ))}
        </div>
      ) : cadenciasFiltradas.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <BellRing size={40} style={{ color: 'var(--cor-borda)' }} className="mb-3" />
          <p className="font-medium" style={{ color: 'var(--cor-texto)' }}>
            {filtro === 'ativa' ? 'Nenhuma cadência ativa' : 'Nenhuma cadência encontrada'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
            As cadências são criadas automaticamente ao agendar consultas
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cadenciasFiltradas.map(c => (
            <CardCadencia
              key={c.id}
              cadencia={c}
              enviando={enviando}
              onEnviarAgora={(id) => void handleEnviarAgora(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
