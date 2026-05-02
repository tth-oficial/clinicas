'use client'

import { useState, useCallback } from 'react'
import { X, Search, Calendar, Clock, User, Stethoscope, DollarSign, FileText, Loader2 } from 'lucide-react'
import type { Contato, Agendamento } from '@/types'

interface ModalAgendamentoProps {
  aberto: boolean
  onFechar: () => void
  onSalvo: (agendamento: Agendamento) => void
  dataInicial?: string
  horaInicial?: string
}

const DURACOES = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
  { label: '120 min', value: 120 },
]

const SERVICOS_SUGERIDOS = [
  'Limpeza de Pele',
  'Botox',
  'Peeling Químico',
  'Microagulhamento',
  'Harmonização Facial',
  'Depilação a Laser',
  'Preenchimento Labial',
  'Drenagem Linfática',
  'Massagem Modeladora',
  'Consulta Avaliação',
]

export function ModalAgendamento({ aberto, onFechar, onSalvo, dataInicial, horaInicial }: ModalAgendamentoProps) {
  const [etapa, setEtapa] = useState<'contato' | 'detalhes'>('contato')
  const [buscaContato, setBuscaContato] = useState('')
  const [contatoSelecionado, setContatoSelecionado] = useState<Contato | null>(null)
  const [contatos, setContatos] = useState<Contato[]>([])
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    servico: '',
    data: dataInicial ?? new Date().toISOString().split('T')[0],
    hora: horaInicial ?? '09:00',
    duracao_minutos: 60,
    profissional: '',
    valor: '',
    notas: '',
  })

  const buscarContatos = useCallback(async (termo: string) => {
    if (termo.length < 2) { setContatos([]); return }
    setBuscando(true)
    try {
      const res = await fetch(`/api/contatos?busca=${encodeURIComponent(termo)}&limite=5`)
      const json = await res.json() as { contatos: Contato[] }
      setContatos(json.contatos ?? [])
    } catch {
      setContatos([])
    } finally {
      setBuscando(false)
    }
  }, [])

  const handleBuscaChange = (v: string) => {
    setBuscaContato(v)
    void buscarContatos(v)
  }

  const selecionarContato = (c: Contato) => {
    setContatoSelecionado(c)
    setBuscaContato(c.nome)
    setContatos([])
    setEtapa('detalhes')
  }

  const handleSalvar = async () => {
    if (!contatoSelecionado || !form.servico || !form.data || !form.hora) return
    setSalvando(true)
    try {
      const dataHora = new Date(`${form.data}T${form.hora}:00`).toISOString()
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contato_id: contatoSelecionado.id,
          servico: form.servico,
          data_hora: dataHora,
          duracao_minutos: form.duracao_minutos,
          profissional: form.profissional || undefined,
          valor: form.valor ? parseFloat(form.valor) : undefined,
          notas: form.notas || undefined,
        }),
      })
      const json = await res.json() as { agendamento: Agendamento }
      if (res.ok && json.agendamento) {
        onSalvo(json.agendamento)
        resetar()
      }
    } finally {
      setSalvando(false)
    }
  }

  const resetar = () => {
    setEtapa('contato')
    setBuscaContato('')
    setContatoSelecionado(null)
    setContatos([])
    setForm({ servico: '', data: new Date().toISOString().split('T')[0], hora: '09:00', duracao_minutos: 60, profissional: '', valor: '', notas: '' })
    onFechar()
  }

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) resetar() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--cor-borda)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--cor-texto)' }}>
              Novo Agendamento
            </h2>
            <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
              {etapa === 'contato' ? 'Busque o paciente' : `Paciente: ${contatoSelecionado?.nome}`}
            </p>
          </div>
          <button
            onClick={resetar}
            className="p-2 rounded-lg transition-colors hover:bg-black/5"
            aria-label="Fechar modal"
          >
            <X size={20} style={{ color: 'var(--cor-texto-suave)' }} />
          </button>
        </div>

        {/* Indicador de progresso */}
        <div className="flex px-6 pt-4 gap-2">
          {['contato', 'detalhes'].map((s, i) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all"
              style={{
                background: etapa === s || (i === 0 && etapa === 'detalhes')
                  ? 'var(--cor-destaque)'
                  : 'var(--cor-borda)',
              }}
            />
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* Etapa 1: Busca de contato */}
          {etapa === 'contato' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>
                Buscar paciente por nome ou telefone
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--cor-texto-suave)' }} />
                <input
                  id="busca-contato-modal"
                  type="text"
                  value={buscaContato}
                  onChange={(e) => handleBuscaChange(e.target.value)}
                  placeholder="Ex: Maria Fernanda ou 86999..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--cor-fundo)',
                    border: '1px solid var(--cor-borda)',
                    color: 'var(--cor-texto)',
                  }}
                />
                {buscando && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--cor-destaque)' }} />
                )}
              </div>

              {/* Resultados */}
              {contatos.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--cor-borda)' }}>
                  {contatos.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selecionarContato(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/5"
                      style={{ borderBottom: '1px solid var(--cor-borda)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--cor-destaque)', color: '#fff' }}
                      >
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--cor-texto)' }}>{c.nome}</p>
                        <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{c.telefone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {buscaContato.length >= 2 && !buscando && contatos.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--cor-texto-suave)' }}>
                  Nenhum paciente encontrado. <button className="font-medium underline" style={{ color: 'var(--cor-destaque)' }}>Criar novo</button>
                </p>
              )}
            </div>
          )}

          {/* Etapa 2: Detalhes do agendamento */}
          {etapa === 'detalhes' && (
            <div className="space-y-4">
              {/* Serviço */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
                  <Stethoscope size={14} className="inline mr-1" />
                  Serviço *
                </label>
                <input
                  id="servico-agendamento"
                  type="text"
                  value={form.servico}
                  onChange={(e) => setForm(f => ({ ...f, servico: e.target.value }))}
                  list="servicos-lista"
                  placeholder="Ex: Limpeza de Pele"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
                />
                <datalist id="servicos-lista">
                  {SERVICOS_SUGERIDOS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
                    <Calendar size={14} className="inline mr-1" />
                    Data *
                  </label>
                  <input
                    id="data-agendamento"
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
                    <Clock size={14} className="inline mr-1" />
                    Hora *
                  </label>
                  <input
                    id="hora-agendamento"
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm(f => ({ ...f, hora: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
                  />
                </div>
              </div>

              {/* Duração */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
                  Duração
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DURACOES.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setForm(f => ({ ...f, duracao_minutos: d.value }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: form.duracao_minutos === d.value ? 'var(--cor-destaque)' : 'var(--cor-fundo)',
                        color: form.duracao_minutos === d.value ? '#fff' : 'var(--cor-texto)',
                        border: `1px solid ${form.duracao_minutos === d.value ? 'var(--cor-destaque)' : 'var(--cor-borda)'}`,
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profissional e Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
                    <User size={14} className="inline mr-1" />
                    Profissional
                  </label>
                  <input
                    id="profissional-agendamento"
                    type="text"
                    value={form.profissional}
                    onChange={(e) => setForm(f => ({ ...f, profissional: e.target.value }))}
                    placeholder="Ex: Dra. Fernanda"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
                    <DollarSign size={14} className="inline mr-1" />
                    Valor (R$)
                  </label>
                  <input
                    id="valor-agendamento"
                    type="number"
                    value={form.valor}
                    onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))}
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
                  <FileText size={14} className="inline mr-1" />
                  Observações
                </label>
                <textarea
                  id="notas-agendamento"
                  value={form.notas}
                  onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Informações adicionais..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
                />
              </div>

              {/* Info sobre cadência */}
              <div
                className="flex items-start gap-2 p-3 rounded-xl text-xs"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <span className="text-lg leading-none">🔔</span>
                <p style={{ color: 'var(--cor-texto-suave)' }}>
                  <strong style={{ color: 'var(--cor-texto)' }}>Cadência anti no-show automática</strong> será criada:
                  confirmação 48h antes, lembrete 24h e aviso 2h antes do horário.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          {etapa === 'detalhes' && (
            <button
              onClick={() => setEtapa('contato')}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto)', border: '1px solid var(--cor-borda)' }}
            >
              Voltar
            </button>
          )}
          <button
            onClick={etapa === 'contato' ? () => contatoSelecionado && setEtapa('detalhes') : handleSalvar}
            disabled={etapa === 'contato' ? !contatoSelecionado : salvando || !form.servico || !form.data || !form.hora}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--cor-destaque)', color: '#fff' }}
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {etapa === 'contato' ? 'Continuar' : 'Salvar Agendamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
