'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Flame, Plus, Play, Pause, RefreshCw,
  Users, Send, MessageSquare, TrendingUp,
  X, Loader2,
} from 'lucide-react'

interface Campanha {
  id: string
  nome: string
  mensagem_template: string
  status: 'rascunho' | 'ativa' | 'pausada' | 'concluida'
  total_contatos: number
  enviados: number
  responderam: number
  convertidos: number
  receita_gerada: number
  periodo_inatividade_meses: number
  criado_em: string
  disparado_em: string | null
  concluido_em: string | null
}

interface ContatoResposta {
  id: string
  status: string
  enviado_em: string | null
  respondeu_em: string | null
  contatos: { id: string; nome: string; telefone: string } | null
}

const STATUS_COR: Record<string, { text: string; bg: string; cor: string }> = {
  rascunho: { text: 'Rascunho', bg: 'rgba(156,163,175,0.1)', cor: '#9CA3AF' },
  ativa:    { text: 'Ativa',    bg: 'rgba(34,197,94,0.1)',   cor: '#22C55E' },
  pausada:  { text: 'Pausada',  bg: 'rgba(245,158,11,0.1)', cor: '#F59E0B' },
  concluida:{ text: 'Concluída',bg: 'rgba(99,102,241,0.1)', cor: '#6366F1' },
}

function formatarData(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function GaugePct({ pct }: { pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
        <span>Progresso de envio</span>
        <span className="font-bold" style={{ color: 'var(--cor-destaque)' }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--cor-borda)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: 'var(--cor-destaque)' }}
        />
      </div>
    </div>
  )
}

// ─── Card de campanha ────────────────────────────────────────
function CardCampanha({
  campanha,
  onDisparar,
  onTogglePausa,
  onVerDetalhes,
  carregando,
}: {
  campanha: Campanha
  onDisparar: (id: string) => void
  onTogglePausa: (id: string, novoStatus: 'ativa' | 'pausada') => void
  onVerDetalhes: (id: string) => void
  carregando: string | null
}) {
  const pct = campanha.total_contatos > 0
    ? Math.round((campanha.enviados / campanha.total_contatos) * 100)
    : 0
  const cfg = STATUS_COR[campanha.status] ?? STATUS_COR.rascunho

  return (
    <div
      className="p-5 rounded-2xl space-y-4"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base" style={{ color: 'var(--cor-texto)' }}>{campanha.nome}</h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: cfg.bg, color: cfg.cor }}
            >
              {cfg.text}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
            Inatividade de {campanha.periodo_inatividade_meses}+ meses · Criada em {formatarData(campanha.criado_em)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {campanha.status === 'rascunho' && (
            <button
              onClick={() => onDisparar(campanha.id)}
              disabled={carregando === campanha.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--cor-destaque)', color: '#fff' }}
            >
              {carregando === campanha.id
                ? <Loader2 size={13} className="animate-spin" />
                : <Play size={13} />}
              Disparar
            </button>
          )}

          {campanha.status === 'ativa' && (
            <button
              onClick={() => onTogglePausa(campanha.id, 'pausada')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <Pause size={13} />
              Pausar
            </button>
          )}

          {campanha.status === 'pausada' && (
            <button
              onClick={() => onTogglePausa(campanha.id, 'ativa')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-90"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <Play size={13} />
              Retomar
            </button>
          )}

          {campanha.status !== 'rascunho' && (
            <button
              onClick={() => onVerDetalhes(campanha.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)', border: '1px solid var(--cor-borda)' }}
            >
              Detalhes
            </button>
          )}
        </div>
      </div>

      {/* Preview da mensagem */}
      <p
        className="text-xs px-3 py-2 rounded-xl leading-relaxed line-clamp-2"
        style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)' }}
      >
        &ldquo;{campanha.mensagem_template}&rdquo;
      </p>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', valor: campanha.total_contatos, icon: <Users size={13} />, cor: 'var(--cor-texto-suave)' },
          { label: 'Enviados', valor: campanha.enviados, icon: <Send size={13} />, cor: 'var(--cor-destaque)' },
          { label: 'Responderam', valor: campanha.responderam, icon: <MessageSquare size={13} />, cor: '#22C55E' },
          { label: 'Convertidos', valor: campanha.convertidos, icon: <TrendingUp size={13} />, cor: '#6366F1' },
        ].map(m => (
          <div key={m.label} className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color: m.cor }}>
              {m.icon}
              <span className="text-lg font-black">{m.valor}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* Gauge de progresso */}
      {campanha.status !== 'rascunho' && <GaugePct pct={pct} />}

      {campanha.disparado_em && (
        <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
          Disparado em {formatarData(campanha.disparado_em)}
          {campanha.concluido_em && ` · Concluído em ${formatarData(campanha.concluido_em)}`}
        </p>
      )}
    </div>
  )
}

// ─── Modal de nova campanha ────────────────────────────────────
function ModalNovaCampanha({
  onFechar,
  onCriada,
}: {
  onFechar: () => void
  onCriada: () => void
}) {
  const [nome, setNome] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [meses, setMeses] = useState(3)
  const [salvando, setSalvando] = useState(false)
  const [preview, setPreview] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !mensagem.trim()) { setErro('Preencha todos os campos'); return }

    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/campanhas/reaquecimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, mensagem_template: mensagem, periodo_inatividade_meses: meses }),
      })
      const json = await res.json() as { total_contatos?: number; error?: string }
      if (!res.ok) { setErro(json.error ?? 'Erro ao criar campanha'); return }
      setPreview(json.total_contatos ?? 0)
      onCriada()
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--cor-borda)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--cor-texto)' }}>Nova campanha de reaquecimento</h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <X size={18} style={{ color: 'var(--cor-texto-suave)' }} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--cor-texto)' }}>
              Nome da campanha
            </label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Reativação Janeiro 2026"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
              style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--cor-texto)' }}>
              Período de inatividade
            </label>
            <select
              value={meses}
              onChange={e => setMeses(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
            >
              <option value={2}>2+ meses sem visita</option>
              <option value={3}>3+ meses sem visita</option>
              <option value={6}>6+ meses sem visita</option>
              <option value={12}>12+ meses sem visita</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--cor-texto)' }}>
              Mensagem
              <span className="font-normal ml-1" style={{ color: 'var(--cor-texto-suave)' }}>
                — use {'{nome}'} para personalizar
              </span>
            </label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              placeholder="Oi {nome}! Sentimos sua falta por aqui..."
              rows={4}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
            />
          </div>

          {preview !== null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <Users size={14} style={{ color: '#22C55E' }} />
              <span className="text-sm" style={{ color: '#22C55E' }}>
                Esta campanha alcançará <strong>{preview}</strong> contatos
              </span>
            </div>
          )}

          {erro && (
            <p className="text-sm text-center" style={{ color: '#EF4444' }}>{erro}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)', border: '1px solid var(--cor-borda)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--cor-destaque)', color: '#fff' }}
            >
              {salvando ? 'Criando...' : 'Criar campanha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal de detalhes ────────────────────────────────────────
function ModalDetalhes({
  campanhaId,
  onFechar,
}: {
  campanhaId: string
  onFechar: () => void
}) {
  const [dados, setDados] = useState<{ campanha: Campanha; responderam: ContatoResposta[] } | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/campanhas/reaquecimento/${campanhaId}`)
        const json = await res.json() as { campanha: Campanha; responderam: ContatoResposta[] }
        setDados(json)
      } finally {
        setCarregando(false)
      }
    })()
  }, [campanhaId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
        style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--cor-borda)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--cor-texto)' }}>
            {dados?.campanha.nome ?? 'Detalhes da campanha'}
          </h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-black/5">
            <X size={18} style={{ color: 'var(--cor-texto-suave)' }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {carregando ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--cor-destaque)' }} />
            </div>
          ) : !dados ? (
            <p className="text-center" style={{ color: 'var(--cor-texto-suave)' }}>Erro ao carregar</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total', valor: dados.campanha.total_contatos },
                  { label: 'Enviados', valor: dados.campanha.enviados },
                  { label: 'Responderam', valor: dados.campanha.responderam },
                  { label: 'Convertidos', valor: dados.campanha.convertidos },
                ].map(m => (
                  <div key={m.label} className="p-3 rounded-xl text-center"
                    style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)' }}>
                    <p className="text-2xl font-black" style={{ color: 'var(--cor-texto)' }}>{m.valor}</p>
                    <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{m.label}</p>
                  </div>
                ))}
              </div>

              {dados.responderam.length > 0 && (
                <div>
                  <p className="text-xs font-bold mb-2" style={{ color: 'var(--cor-texto-suave)' }}>
                    RESPONDERAM ({dados.responderam.length})
                  </p>
                  <div className="space-y-2">
                    {dados.responderam.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>
                            {r.contatos?.nome ?? '—'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
                            {r.contatos?.telefone}
                          </p>
                        </div>
                        <span className="text-xs" style={{ color: '#22C55E' }}>
                          {r.respondeu_em ? formatarData(r.respondeu_em) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────
export function PainelReaquecimento() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalNova, setModalNova] = useState(false)
  const [detalhesId, setDetalhesId] = useState<string | null>(null)
  const [disparando, setDisparando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/campanhas/reaquecimento')
      const json = await res.json() as { campanhas: Campanha[] }
      setCampanhas(json.campanhas ?? [])
    } catch {
      setCampanhas([])
    } finally {
      setCarregando(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregar() }, [carregar])

  const handleDisparar = async (id: string) => {
    setDisparando(id)
    try {
      await fetch(`/api/campanhas/reaquecimento/${id}/disparar`, { method: 'POST' })
      void carregar()
    } finally {
      setDisparando(null)
    }
  }

  const handleTogglePausa = async (id: string, novoStatus: 'ativa' | 'pausada') => {
    try {
      await fetch(`/api/campanhas/reaquecimento/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      void carregar()
    } catch {
      // silencioso
    }
  }

  const ativas = campanhas.filter(c => c.status === 'ativa').length
  const totalEnviados = campanhas.reduce((s, c) => s + c.enviados, 0)
  const totalResponderam = campanhas.reduce((s, c) => s + c.responderam, 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Campanhas',     valor: campanhas.length, icon: '📣',  cor: 'var(--cor-destaque)' },
          { label: 'Ativas agora',  valor: ativas,           icon: '🔥',  cor: '#22C55E' },
          { label: 'Total enviados',valor: totalEnviados,    icon: '📤',  cor: '#6366F1' },
          { label: 'Responderam',   valor: totalResponderam, icon: '💬',  cor: '#F59E0B' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-2xl"
            style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{kpi.icon}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--cor-texto-suave)' }}>{kpi.label}</span>
            </div>
            <span className="text-3xl font-black" style={{ color: kpi.cor }}>{kpi.valor}</span>
          </div>
        ))}
      </div>

      {/* Header de ações */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-bold text-lg" style={{ color: 'var(--cor-texto)' }}>
          Campanhas
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void carregar()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)', border: '1px solid var(--cor-borda)' }}
          >
            <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            onClick={() => setModalNova(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'var(--cor-destaque)', color: '#fff' }}
          >
            <Plus size={15} />
            Nova campanha
          </button>
        </div>
      </div>

      {/* Lista de campanhas */}
      {carregando ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--cor-card)' }} />
          ))}
        </div>
      ) : campanhas.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <Flame size={44} style={{ color: 'var(--cor-borda)' }} className="mb-3" />
          <p className="font-medium text-lg" style={{ color: 'var(--cor-texto)' }}>
            Nenhuma campanha ainda
          </p>
          <p className="text-sm mt-1 mb-6" style={{ color: 'var(--cor-texto-suave)' }}>
            Crie uma campanha para reativar contatos inativos via WhatsApp
          </p>
          <button
            onClick={() => setModalNova(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all hover:opacity-90"
            style={{ background: 'var(--cor-destaque)', color: '#fff' }}
          >
            <Plus size={16} />
            Criar primeira campanha
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campanhas.map(c => (
            <CardCampanha
              key={c.id}
              campanha={c}
              onDisparar={(id) => void handleDisparar(id)}
              onTogglePausa={(id, st) => void handleTogglePausa(id, st)}
              onVerDetalhes={(id) => setDetalhesId(id)}
              carregando={disparando}
            />
          ))}
        </div>
      )}

      {modalNova && (
        <ModalNovaCampanha
          onFechar={() => setModalNova(false)}
          onCriada={() => void carregar()}
        />
      )}

      {detalhesId && (
        <ModalDetalhes
          campanhaId={detalhesId}
          onFechar={() => setDetalhesId(null)}
        />
      )}
    </div>
  )
}
