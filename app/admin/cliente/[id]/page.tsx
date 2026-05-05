'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Check } from 'lucide-react'

interface ClienteConfig {
  id: string
  nome: string
  responsavel: string
  especialidade: string
  cidade: string
  whatsapp: string
  plano: string
  ativo: boolean
  cor_principal: string
  nome_exibicao: string
  slogan: string
  fonte: string
  agente_nome: string
  agente_tom: string
  agente_prompt: string
  openai_api_key: string
  openai_model: string
  evolution_instance: string
  evolution_url: string
  evolution_api_key: string
  modulos_ativos: string[]
}

export default function EditarClientePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [form, setForm] = useState<ClienteConfig | null>(null)

  useEffect(() => {
    fetch(`/api/admin/clinicas/${id}`)
      .then(r => r.json())
      .then((d: { cliente?: ClienteConfig }) => {
        if (d.cliente) setForm(d.cliente)
      })
      .finally(() => setCarregando(false))
  }, [id])

  function set(k: keyof ClienteConfig) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => f ? ({ ...f, [k]: e.target.value }) : f)
  }

  async function handleSalvar() {
    if (!form) return
    setSalvando(true)
    setMensagem('')
    try {
      const res = await fetch(`/api/admin/clinicas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      setMensagem(data.ok ? 'Salvo!' : (data.error ?? 'Erro'))
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-40" style={{ color: '#6B7280' }}>
        <Loader2 size={18} className="animate-spin mr-2" />
        <span className="text-sm">Carregando...</span>
      </div>
    )
  }

  if (!form) {
    return <p className="text-sm text-center" style={{ color: '#EF4444' }}>Cliente não encontrado.</p>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin')}
          className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: '#6B7280' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{form.nome_exibicao || form.nome}</h1>
          <p className="text-xs" style={{ color: '#6B7280' }}>Editar configurações do cliente</p>
        </div>
      </div>

      <div className="rounded-xl border p-5 space-y-5" style={{ background: '#0F1511', borderColor: '#1F2B27' }}>
        <Titulo>Dados da clínica</Titulo>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Nome" valor={form.nome} onChange={set('nome')} />
          <Campo label="Nome de exibição" valor={form.nome_exibicao} onChange={set('nome_exibicao')} />
          <Campo label="Responsável" valor={form.responsavel} onChange={set('responsavel')} />
          <Campo label="Especialidade" valor={form.especialidade} onChange={set('especialidade')} />
          <Campo label="Cidade" valor={form.cidade} onChange={set('cidade')} />
          <Campo label="WhatsApp" valor={form.whatsapp} onChange={set('whatsapp')} />
          <Campo label="Slogan" valor={form.slogan} onChange={set('slogan')} />
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Plano</label>
            <select value={form.plano} onChange={set('plano')}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }}>
              <option value="entrada">Entrada</option>
              <option value="medio">Médio</option>
              <option value="alto">Alto</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t" style={{ borderColor: '#1F2B27' }}>
          <Titulo>Agente IA</Titulo>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nome da IA" valor={form.agente_nome} onChange={set('agente_nome')} />
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Tom</label>
              <select value={form.agente_tom} onChange={set('agente_tom')}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }}>
                {['profissional e acolhedor','amigável e descontraído','empático e cuidadoso','formal e técnico']
                  .map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Prompt</label>
            <textarea value={form.agente_prompt} onChange={set('agente_prompt')} rows={8}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none font-mono"
              style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }} />
          </div>
        </div>

        <div className="pt-4 border-t" style={{ borderColor: '#1F2B27' }}>
          <Titulo>Integrações</Titulo>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="OpenAI API Key" valor={form.openai_api_key} onChange={set('openai_api_key')} tipo="password" />
            <Campo label="Instância Evolution" valor={form.evolution_instance} onChange={set('evolution_instance')} />
          </div>
        </div>

        <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: '#1F2B27' }}>
          {mensagem && (
            <span className="flex items-center gap-1.5 text-sm"
              style={{ color: mensagem === 'Salvo!' ? '#22C55E' : '#EF4444' }}>
              {mensagem === 'Salvo!' && <Check size={13} />}
              {mensagem}
            </span>
          )}
          <button onClick={handleSalvar} disabled={salvando}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-60"
            style={{ background: '#1B5E4F' }}>
            {salvando && <Loader2 size={13} className="animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-white">{children}</h3>
}

function Campo({ label, valor, onChange, tipo = 'text' }: {
  label: string; valor: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  tipo?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>{label}</label>
      <input type={tipo} value={valor} onChange={onChange}
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }} />
    </div>
  )
}
