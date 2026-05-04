'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Send, ChevronDown, ChevronUp,
  Clock, CheckCircle2, MessageSquare, AlertTriangle,
  XCircle, User, Flame,
} from 'lucide-react'

interface EtapaCadencia {
  id: string
  numero: number
  mensagem_template: string
  status: 'pendente' | 'enviado' | 'sem_resposta' | 'respondido'
  enviado_em: string | null
  resposta_recebida: string | null
}

interface CadenciaFollowUp {
  id: string
  contato_id: string
  lead_id: string | null
  etapa_atual: number
  total_etapas: number
  status: 'ativa' | 'pausada' | 'concluida' | 'cancelada'
  proxima_execucao: string | null
  criado_em: string
  leads: {
    id: string
    servico: string
    status: string
    temperatura: string
    atualizado_em: string
  } | null
  contatos: {
    id: string
    nome: string
    telefone: string
  } | null
  cadencia_etapas: EtapaCadencia[]
}

const STATUS_ETAPA = {
  pendente:     { label: 'Pendente',     icon: <Clock size={13} />,          cor: '#F59E0B' },
  enviado:      { label: 'Enviado',      icon: <CheckCircle2 size={13} />,   cor: '#6366F1' },
  sem_resposta: { label: 'Sem resposta', icon: <AlertTriangle size={13} />,  cor: '#EF4444' },
  respondido:   { label: 'Respondido',   icon: <MessageSquare size={13} />,  cor: '#22C55E' },
}

const TEMP_COR: Record<string, string> = {
  quente: '#EF4444',
  morno:  '#F59E0B',
  frio:   '#6366F1',
}

function formatarData(dt: string) {
  return new Date(dt).toLocaleString('pt-BR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function BarraProgresso({ atual, total }: { atual: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{
            background: i < atual ? 'var(--cor-destaque)' : i === atual ? '#F59E0B' : 'var(--cor-borda)',
            fontSize: 10,
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  )
}

function CardFollowUp({
  cadencia,
  onEnviar,
  onEncerrar,
  enviando,
  encerrando,
}: {
  cadencia: CadenciaFollowUp
  onEnviar: (id: string) => void
  onEncerrar: (id: string) => void
  enviando: string | null
  encerrando: string | null
}) {
  const [expandido, setExpandido] = useState(false)
  const contato = cadencia.contatos
  const lead = cadencia.leads
  const proximaEtapa = cadencia.cadencia_etapas.find(
    e => e.numero === cadencia.etapa_atual + 1 && e.status === 'pendente'
  )

  const statusCor = {
    ativa: '#22C55E', pausada: '#F59E0B',
    concluida: '#6366F1', cancelada: '#9CA3AF',
  }[cadencia.status] ?? '#9CA3AF'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Info do lead */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
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
                  {cadencia.status === 'ativa' ? 'Ativa' : cadencia.status === 'concluida' ? 'Concluída' : cadencia.status === 'cancelada' ? 'Encerrada' : 'Pausada'}
                </span>
                {lead?.temperatura && (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: `${TEMP_COR[lead.temperatura]}18`, color: TEMP_COR[lead.temperatura] }}
                  >
                    <Flame size={10} />
                    {lead.temperatura}
                  </span>
                )}
              </div>

              <p className="text-xs mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
                <User size={11} className="inline mr-1" />
                {contato?.telefone}
              </p>

              {lead && (
                <p className="text-xs mt-1 font-medium" style={{ color: 'var(--cor-destaque)' }}>
                  {lead.servico}
                </p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <BarraProgresso atual={cadencia.etapa_atual} total={cadencia.total_etapas} />

            {cadencia.status === 'ativa' && proximaEtapa && (
              <button
                onClick={() => onEnviar(cadencia.id)}
                disabled={enviando === cadencia.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--cor-destaque)', color: '#fff' }}
              >
                <Send size={12} />
                {enviando === cadencia.id ? 'Enviando...' : 'Enviar'}
              </button>
            )}

            {cadencia.status === 'ativa' && (
              <button
                onClick={() => onEncerrar(cadencia.id)}
                disabled={encerrando === cadencia.id}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 disabled:opacity-60"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                title="Encerrar follow-up e marcar como frio"
              >
                <XCircle size={12} />
                {encerrando === cadencia.id ? '...' : 'Encerrar'}
              </button>
            )}

            <button
              onClick={() => setExpandido(!expandido)}
              className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            >
              {expandido
                ? <ChevronUp size={16} style={{ color: 'var(--cor-texto-suave)' }} />
                : <ChevronDown size={16} style={{ color: 'var(--cor-texto-suave)' }} />}
            </button>
          </div>
        </div>

        {cadencia.status === 'ativa' && cadencia.proxima_execucao && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Clock size={12} style={{ color: '#F59E0B' }} />
            <span className="text-xs" style={{ color: '#F59E0B' }}>
              Próximo envio: {formatarData(cadencia.proxima_execucao)}
            </span>
          </div>
        )}
      </div>

      {/* Etapas expandidas */}
      {expandido && (
        <div className="border-t px-4 pb-4 space-y-2" style={{ borderColor: 'var(--cor-borda)' }}>
          <p className="text-xs font-bold pt-3 mb-2" style={{ color: 'var(--cor-texto-suave)' }}>
            TENTATIVAS
          </p>
          {cadencia.cadencia_etapas
            .sort((a, b) => a.numero - b.numero)
            .map(etapa => {
              const cfg = STATUS_ETAPA[etapa.status]
              return (
                <div
                  key={etapa.id}
                  className="p-3 rounded-xl"
                  style={{ background: `${cfg.cor}10`, border: `1px solid ${cfg.cor}30` }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2" style={{ color: cfg.cor }}>
                      {cfg.icon}
                      <span className="text-xs font-bold">Tentativa {etapa.numero}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${cfg.cor}20`, color: cfg.cor }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--cor-texto)' }}>
                    {etapa.mensagem_template}
                  </p>
                  {etapa.enviado_em && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--cor-texto-suave)' }}>
                      ✓ Enviado em {formatarData(etapa.enviado_em)}
                    </p>
                  )}
                  {etapa.resposta_recebida && (
                    <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)' }}>
                      <p className="text-xs" style={{ color: '#22C55E' }}>
                        💬 &ldquo;{etapa.resposta_recebida}&rdquo;
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

// ─── KPIs ────────────────────────────────────────────────────
function KPIs({ cadencias }: { cadencias: CadenciaFollowUp[] }) {
  const ativas = cadencias.filter(c => c.status === 'ativa').length
  const concluidas = cadencias.filter(c => c.status === 'concluida').length
  const enviadas = cadencias.flatMap(c => c.cadencia_etapas).filter(e => e.status === 'enviado').length
  const responderam = cadencias.flatMap(c => c.cadencia_etapas).filter(e => e.status === 'respondido').length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Follow-ups ativos', valor: ativas, icon: '🔄', cor: '#22C55E' },
        { label: 'Concluídos', valor: concluidas, icon: '✅', cor: '#6366F1' },
        { label: 'Mensagens enviadas', valor: enviadas, icon: '📤', cor: 'var(--cor-destaque)' },
        { label: 'Respostas', valor: responderam, icon: '💬', cor: '#F59E0B' },
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
type FiltroStatus = 'todas' | 'ativa' | 'concluida' | 'cancelada'

export function ListaFollowUp() {
  const [cadencias, setCadencias] = useState<CadenciaFollowUp[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<FiltroStatus>('ativa')
  const [enviando, setEnviando] = useState<string | null>(null)
  const [encerrando, setEncerrando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/follow-up')
      const json = await res.json() as { cadencias: CadenciaFollowUp[] }
      setCadencias(json.cadencias ?? [])
    } catch {
      setCadencias([])
    } finally {
      setCarregando(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregar() }, [carregar])

  const handleEnviar = async (id: string) => {
    setEnviando(id)
    try {
      await fetch('/api/follow-up/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadencia_id: id }),
      })
      void carregar()
    } finally {
      setEnviando(null)
    }
  }

  const handleEncerrar = async (id: string) => {
    setEncerrando(id)
    try {
      await fetch('/api/follow-up/encerrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadencia_id: id }),
      })
      void carregar()
    } finally {
      setEncerrando(null)
    }
  }

  const FILTROS = [
    { key: 'todas' as FiltroStatus,    label: 'Todas',    count: cadencias.length },
    { key: 'ativa' as FiltroStatus,    label: 'Ativos',   count: cadencias.filter(c => c.status === 'ativa').length },
    { key: 'concluida' as FiltroStatus,label: 'Concluídos',count: cadencias.filter(c => c.status === 'concluida').length },
    { key: 'cancelada' as FiltroStatus,label: 'Encerrados',count: cadencias.filter(c => c.status === 'cancelada').length },
  ]

  const filtradas = filtro === 'todas' ? cadencias : cadencias.filter(c => c.status === filtro)

  return (
    <div className="space-y-5">
      <KPIs cadencias={cadencias} />

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

      {carregando ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--cor-card)' }} />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <RefreshCw size={40} style={{ color: 'var(--cor-borda)' }} className="mb-3" />
          <p className="font-medium" style={{ color: 'var(--cor-texto)' }}>
            {filtro === 'ativa' ? 'Nenhum follow-up ativo' : 'Nenhum registro encontrado'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
            Follow-ups são criados automaticamente quando leads ficam 2+ dias sem resposta
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(c => (
            <CardFollowUp
              key={c.id}
              cadencia={c}
              onEnviar={(id) => void handleEnviar(id)}
              onEncerrar={(id) => void handleEncerrar(id)}
              enviando={enviando}
              encerrando={encerrando}
            />
          ))}
        </div>
      )}
    </div>
  )
}
