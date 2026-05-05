'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, Check, X, UserCircle2, Phone, Bell, BellOff } from 'lucide-react'
import type { ClinicaConfig } from '@/types'

interface Profissional {
  id: string
  nome: string
  especialidade: string
  telefone: string
  email: string
  cor: string
  bio: string
  ativo: boolean
}

interface Props {
  config?: ClinicaConfig
  onSalvar?: (dados: Partial<ClinicaConfig>) => Promise<void>
}

const CORES_PADRAO = ['#2D8B73', '#1B5E4F', '#7B2D8B', '#D97706', '#2563EB', '#DB2777', '#475569']

const empty = (): Omit<Profissional, 'id' | 'ativo'> => ({
  nome: '',
  especialidade: '',
  telefone: '',
  email: '',
  cor: '#2D8B73',
  bio: '',
})

export function AbaEquipe({ config, onSalvar }: Props) {
  const [lista, setLista] = useState<Profissional[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null) // id ou 'novo'
  const [form, setForm] = useState(empty())
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  // ── Escalação ─────────────────────────────────────────────────────────────
  const [telefoneEscalacao, setTelefoneEscalacao] = useState(
    config?.telefone_escalacao ?? ''
  )
  const [notificarEscalacao, setNotificarEscalacao] = useState(
    config?.notificar_escalacao ?? true
  )
  const [salvandoEscalacao, setSalvandoEscalacao] = useState(false)
  const [msgEscalacao, setMsgEscalacao] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/profissionais')
      const d = await r.json() as { profissionais?: Profissional[] }
      setLista(d.profissionais ?? [])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  function iniciarNovo() {
    setForm(empty())
    setEditando('novo')
    setMsg('')
  }

  function iniciarEdicao(p: Profissional) {
    setForm({
      nome: p.nome ?? '',
      especialidade: p.especialidade ?? '',
      telefone: p.telefone ?? '',
      email: p.email ?? '',
      cor: p.cor ?? '#2D8B73',
      bio: p.bio ?? '',
    })
    setEditando(p.id)
    setMsg('')
  }

  function cancelar() {
    setEditando(null)
    setForm(empty())
  }

  async function salvar() {
    if (!form.nome.trim()) { setMsg('Nome é obrigatório'); return }
    setSalvando(true)
    setMsg('')
    try {
      const isNovo = editando === 'novo'
      const res = await fetch(
        isNovo ? '/api/profissionais' : `/api/profissionais/${editando}`,
        {
          method: isNovo ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      if (!res.ok) throw new Error('Erro ao salvar')
      setMsg(isNovo ? 'Profissional adicionado!' : 'Salvo!')
      setEditando(null)
      await carregar()
    } catch {
      setMsg('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id: string) {
    if (!confirm('Remover este profissional?')) return
    await fetch(`/api/profissionais/${id}`, { method: 'DELETE' })
    await carregar()
  }

  async function salvarEscalacao() {
    if (!onSalvar) return
    setSalvandoEscalacao(true)
    setMsgEscalacao('')
    try {
      await onSalvar({
        telefone_escalacao: telefoneEscalacao || null,
        notificar_escalacao: notificarEscalacao,
      } as Partial<ClinicaConfig>)
      setMsgEscalacao('Configuração salva!')
      setTimeout(() => setMsgEscalacao(''), 3000)
    } catch {
      setMsgEscalacao('Erro ao salvar')
    } finally {
      setSalvandoEscalacao(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ── Seção Profissionais ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--cor-texto)' }}>
              Equipe
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
              Profissionais disponíveis para agendamento via IA
            </p>
          </div>
          <button
            onClick={iniciarNovo}
            disabled={editando !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--cor-primaria)' }}
          >
            <Plus size={13} /> Adicionar
          </button>
        </div>

        {/* Formulário inline */}
        {editando !== null && (
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--cor-primaria)', background: 'rgba(27,94,79,0.05)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--cor-primaria)' }}>
              {editando === 'novo' ? 'Novo profissional' : 'Editar profissional'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Nome *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Dra. Ana Lima"
                  className="w-full px-3 py-1.5 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Especialidade</label>
                <input
                  value={form.especialidade}
                  onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
                  placeholder="Estética, Nutrição..."
                  className="w-full px-3 py-1.5 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Telefone</label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(86) 99999-9999"
                  className="w-full px-3 py-1.5 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="profissional@clinica.com"
                  className="w-full px-3 py-1.5 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Cor (calendário)</label>
              <div className="flex items-center gap-2 flex-wrap">
                {CORES_PADRAO.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, cor: c }))}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: c,
                      border: form.cor === c ? '2px solid var(--cor-texto)' : '2px solid transparent',
                    }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
                <input
                  type="color"
                  value={form.cor}
                  onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                  aria-label="Cor personalizada"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Bio (apresentada ao paciente)</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={2}
                placeholder="Especialista com 10 anos de experiência..."
                className="w-full px-3 py-1.5 rounded-lg border text-sm resize-none"
                style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
              />
            </div>
            {msg && <p className="text-xs" style={{ color: msg.includes('Erro') ? '#EF4444' : '#22C55E' }}>{msg}</p>}
            <div className="flex gap-2">
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: 'var(--cor-primaria)' }}
              >
                {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={cancelar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto-suave)' }}
              >
                <X size={12} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de profissionais */}
        {carregando ? (
          <div className="flex items-center justify-center py-8" style={{ color: 'var(--cor-texto-suave)' }}>
            <Loader2 size={18} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : lista.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed" style={{ borderColor: 'var(--cor-borda)' }}>
            <UserCircle2 size={28} className="mx-auto mb-2" style={{ color: 'var(--cor-texto-suave)' }} />
            <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Nenhum profissional cadastrado</p>
            <p className="text-xs mt-1" style={{ color: 'var(--cor-texto-suave)' }}>A IA usará os nomes dos profissionais ao agendar consultas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lista.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
                style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-card)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-2.5 h-10 rounded-full flex-shrink-0"
                    style={{ background: p.cor || '#2D8B73' }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>{p.nome}</p>
                    {p.especialidade && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>{p.especialidade}</p>
                    )}
                    {p.telefone && (
                      <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--cor-texto-suave)' }}>{p.telefone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => iniciarEdicao(p)}
                    disabled={editando !== null}
                    className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
                    style={{ color: 'var(--cor-texto-suave)' }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remover(p.id)}
                    className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Divisor ─────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--cor-borda)' }} />

      {/* ── Seção Escalação para Humano ──────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--cor-texto)' }}>
            <Phone size={14} style={{ color: 'var(--cor-primaria)' }} />
            Escalação para humano
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
            Quando um paciente pedir para falar com uma pessoa ou o agente IA escalar o atendimento,
            uma notificação é enviada via WhatsApp para este número.
          </p>
        </div>

        <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-card)' }}>
          {/* Toggle notificação */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>Notificação por WhatsApp</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
                Ativar notificação quando o agente escalar
              </p>
            </div>
            <button
              onClick={() => setNotificarEscalacao(v => !v)}
              className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: notificarEscalacao ? 'var(--cor-primaria)' : 'var(--cor-borda)' }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ left: notificarEscalacao ? '22px' : '2px' }}
              />
            </button>
          </div>

          {/* Campo telefone */}
          {notificarEscalacao && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cor-texto-suave)' }}>
                Número para notificação
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--cor-texto-suave)' }}
                />
                <input
                  type="tel"
                  value={telefoneEscalacao}
                  onChange={e => setTelefoneEscalacao(e.target.value)}
                  placeholder="5511999999999 (com código do país)"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm font-mono"
                  style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-fundo)' }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
                Formato: código do país + DDD + número (ex: 5511987654321)
              </p>
            </div>
          )}

          {/* Prévia da notificação */}
          {notificarEscalacao && (
            <div
              className="rounded-lg p-3 text-xs font-mono"
              style={{ background: 'rgba(27,94,79,0.06)', color: 'var(--cor-texto-suave)', borderLeft: '3px solid var(--cor-primaria)' }}
            >
              <p className="font-semibold mb-1" style={{ color: 'var(--cor-texto)' }}>Prévia da notificação:</p>
              <p>🔔 <strong>Escalação de Atendimento</strong></p>
              <p>Paciente: João Silva</p>
              <p>Tel: 5511999999999</p>
              <p>Motivo: Paciente solicitou falar com atendente</p>
              <p className="mt-1">Acesse o sistema para continuar o atendimento.</p>
            </div>
          )}

          {/* Sem notificação */}
          {!notificarEscalacao && (
            <div
              className="flex items-center gap-2 rounded-lg p-3 text-xs"
              style={{ background: 'rgba(239,68,68,0.06)', color: '#EF4444' }}
            >
              <BellOff size={13} />
              <span>Notificações desativadas — escalações ocorrerão silenciosamente.</span>
            </div>
          )}

          {/* Botão salvar */}
          {onSalvar && (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={salvarEscalacao}
                disabled={salvandoEscalacao}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--cor-primaria)' }}
              >
                {salvandoEscalacao ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                {salvandoEscalacao ? 'Salvando...' : 'Salvar configuração'}
              </button>
              {msgEscalacao && (
                <span
                  className="text-sm"
                  style={{ color: msgEscalacao.includes('Erro') ? '#EF4444' : '#22C55E' }}
                >
                  {msgEscalacao}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
