'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, Check, X, Scissors } from 'lucide-react'

interface Servico {
  id: string
  nome: string
  descricao: string
  duracao_minutos: number
  valor: number | null
  ativo: boolean
}

const empty = () => ({
  nome: '',
  descricao: '',
  duracao_minutos: 60,
  valor: '' as string | number,
})

export function AbaServicos() {
  const [lista, setLista] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState(empty())
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/servicos')
      const d = await r.json() as { servicos?: Servico[] }
      setLista(d.servicos ?? [])
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

  function iniciarEdicao(s: Servico) {
    setForm({
      nome: s.nome,
      descricao: s.descricao ?? '',
      duracao_minutos: s.duracao_minutos,
      valor: s.valor ?? '',
    })
    setEditando(s.id)
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
      const payload = {
        ...form,
        valor: form.valor === '' ? null : Number(form.valor),
        duracao_minutos: Number(form.duracao_minutos),
      }
      const res = await fetch(
        isNovo ? '/api/servicos' : `/api/servicos/${editando}`,
        {
          method: isNovo ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) throw new Error('Erro ao salvar')
      setMsg(isNovo ? 'Serviço criado!' : 'Salvo!')
      setEditando(null)
      await carregar()
    } catch {
      setMsg('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id: string) {
    if (!confirm('Remover este serviço?')) return
    await fetch(`/api/servicos/${id}`, { method: 'DELETE' })
    await carregar()
  }

  function formatarDuracao(min: number) {
    if (min < 60) return `${min}min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}h${m}min` : `${h}h`
  }

  function formatarValor(v: number | null) {
    if (!v) return '—'
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const DURACOES = [15, 30, 45, 60, 90, 120, 150, 180]

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--cor-texto)' }}>
            Serviços
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
            A IA usará esses dados ao apresentar opções e agendar consultas
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
            {editando === 'novo' ? 'Novo serviço' : 'Editar serviço'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Nome *</label>
              <input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Botox, Limpeza de pele, Consulta..."
                className="w-full px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Duração</label>
              <select
                value={form.duracao_minutos}
                onChange={e => setForm(f => ({ ...f, duracao_minutos: Number(e.target.value) }))}
                className="w-full px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
              >
                {DURACOES.map(d => (
                  <option key={d} value={d}>{formatarDuracao(d)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Valor (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00 — deixe vazio para consultar"
                className="w-full px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cor-texto-suave)' }}>Descrição (apresentada ao paciente)</label>
              <textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
                placeholder="Procedimento para eliminar rugas de expressão..."
                className="w-full px-3 py-1.5 rounded-lg border text-sm resize-none"
                style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
              />
            </div>
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

      {/* Lista */}
      {carregando ? (
        <div className="flex items-center justify-center py-8" style={{ color: 'var(--cor-texto-suave)' }}>
          <Loader2 size={18} className="animate-spin mr-2" /> Carregando...
        </div>
      ) : lista.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed" style={{ borderColor: 'var(--cor-borda)' }}>
          <Scissors size={28} className="mx-auto mb-2" style={{ color: 'var(--cor-texto-suave)' }} />
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Nenhum serviço cadastrado</p>
          <p className="text-xs mt-1" style={{ color: 'var(--cor-texto-suave)' }}>Adicione serviços para que a IA possa agendar e apresentar ao paciente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map(s => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
              style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-card)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>{s.nome}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(27,94,79,0.12)', color: 'var(--cor-primaria)' }}>
                    {formatarDuracao(s.duracao_minutos)}
                  </span>
                  {s.valor && (
                    <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
                      {formatarValor(s.valor)}
                    </span>
                  )}
                </div>
                {s.descricao && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--cor-texto-suave)' }}>{s.descricao}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => iniciarEdicao(s)}
                  disabled={editando !== null}
                  className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
                  style={{ color: 'var(--cor-texto-suave)' }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remover(s.id)}
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
  )
}
