'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Check, Copy, ExternalLink,
  ChevronDown, ChevronRight,
} from 'lucide-react'

interface Resultado {
  clinica_id: string
  email: string
  senha: string
  url_acesso: string
}

const MODULOS = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'crm',          label: 'CRM' },
  { id: 'whatsapp',     label: 'WhatsApp + IA' },
  { id: 'agendamento',  label: 'Agendamento' },
  { id: 'anti_noshow',  label: 'Anti No-Show' },
  { id: 'leads',        label: 'Leads' },
  { id: 'followup',     label: 'Follow-up' },
  { id: 'nutricao',     label: 'Nutrição' },
  { id: 'reaquecimento',label: 'Reaquecimento' },
  { id: 'ia_decisao',   label: 'IA Decisão' },
  { id: 'relatorio',    label: 'Relatório' },
]

export default function NovoClientePage() {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [secaoAberta, setSecaoAberta] = useState<string>('clinica')
  const [copiado, setCopiado] = useState('')

  const [form, setForm] = useState({
    // Clínica
    nome: '',
    responsavel: '',
    especialidade: '',
    cidade: '',
    whatsapp: '',
    plano: 'medio' as 'entrada' | 'medio' | 'alto',
    // Visual
    cor_principal: '#1B5E4F',
    nome_exibicao: '',
    slogan: '',
    fonte: 'Plus Jakarta Sans',
    // Agente
    agente_nome: 'Sofia',
    agente_tom: 'profissional e acolhedor',
    agente_prompt: '',
    // Integrações
    openai_api_key: '',
    openai_model: 'gpt-4.1',
    evolution_instance: '',
    evolution_url: '',
    evolution_api_key: '',
    // Acesso
    email_admin: '',
    senha_admin: '',
    // Módulos
    modulos_ativos: MODULOS.map(m => m.id),
  })

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function gerarSenha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
    const senha = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm(f => ({ ...f, senha_admin: senha }))
  }

  function gerarInstancia() {
    const slug = form.nome.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setForm(f => ({ ...f, evolution_instance: slug }))
  }

  function toggleModulo(id: string) {
    if (id === 'dashboard') return
    setForm(f => ({
      ...f,
      modulos_ativos: f.modulos_ativos.includes(id)
        ? f.modulos_ativos.filter(m => m !== id)
        : [...f.modulos_ativos, id],
    }))
  }

  async function copiar(texto: string, chave: string) {
    await navigator.clipboard.writeText(texto)
    setCopiado(chave)
    setTimeout(() => setCopiado(''), 2000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.email_admin || !form.senha_admin) {
      setErro('Preencha pelo menos: nome da clínica, email e senha de acesso.')
      return
    }
    setCriando(true)
    setErro('')

    try {
      const res = await fetch('/api/admin/clinicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as Resultado & { error?: string }

      if (!res.ok || data.error) {
        setErro(data.error ?? 'Erro ao criar cliente')
        return
      }

      setResultado(data)
    } finally {
      setCriando(false)
    }
  }

  // Tela de sucesso
  if (resultado) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border p-8 space-y-6" style={{ background: '#0F1511', borderColor: '#1F2B27' }}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(34,197,94,0.15)' }}>
              <Check size={24} style={{ color: '#22C55E' }} />
            </div>
            <h2 className="text-xl font-bold text-white">Cliente criado!</h2>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              {form.nome_exibicao || form.nome} está pronta para usar o sistema.
            </p>
          </div>

          <div className="space-y-3">
            <CredencialItem
              label="URL de acesso"
              valor={resultado.url_acesso}
              chave="url"
              copiado={copiado}
              onCopiar={copiar}
            />
            <CredencialItem
              label="Email"
              valor={resultado.email}
              chave="email"
              copiado={copiado}
              onCopiar={copiar}
            />
            <CredencialItem
              label="Senha"
              valor={resultado.senha}
              chave="senha"
              copiado={copiado}
              onCopiar={copiar}
            />
            <CredencialItem
              label="ID da clínica (para webhook)"
              valor={resultado.clinica_id}
              chave="id"
              copiado={copiado}
              onCopiar={copiar}
            />
          </div>

          <div className="rounded-xl p-4 text-xs space-y-1" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
            <p className="font-bold">Próximos passos:</p>
            <p>1. Configure o webhook da Evolution com o ID acima</p>
            <p>2. Faça login como o cliente e finalize o prompt da IA</p>
            <p>3. Conecte o WhatsApp em Configurações → WhatsApp</p>
          </div>

          <div className="flex gap-3">
            <a href={resultado.url_acesso} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: '#1B5E4F' }}>
              <ExternalLink size={14} /> Acessar sistema
            </a>
            <button
              onClick={() => router.push('/admin')}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-opacity hover:opacity-80"
              style={{ borderColor: '#1F2B27', color: '#9CA3AF' }}>
              Ver todos os clientes
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Novo cliente</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Preencha os dados abaixo. O sistema cria a clínica, o usuário e a configuração automaticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Seção: Dados da clínica */}
        <Secao
          id="clinica"
          titulo="Dados da clínica"
          aberta={secaoAberta === 'clinica'}
          onToggle={id => setSecaoAberta(secaoAberta === id ? '' : id)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nome da clínica *" valor={form.nome} onChange={set('nome')} placeholder="Clínica Bella Vida" />
            <Campo label="Nome de exibição" valor={form.nome_exibicao} onChange={set('nome_exibicao')} placeholder="Bella Vida (igual ou mais curto)" />
            <Campo label="Responsável" valor={form.responsavel} onChange={set('responsavel')} placeholder="Dra. Ana Lima" />
            <Campo label="Especialidade" valor={form.especialidade} onChange={set('especialidade')} placeholder="Estética, Odontologia..." />
            <Campo label="Cidade" valor={form.cidade} onChange={set('cidade')} placeholder="Teresina, PI" />
            <Campo label="WhatsApp (só números)" valor={form.whatsapp} onChange={set('whatsapp')} placeholder="5586999990000" />
            <Campo label="Slogan" valor={form.slogan} onChange={set('slogan')} placeholder="Sua beleza, nosso cuidado" />
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
        </Secao>

        {/* Seção: Visual */}
        <Secao
          id="visual"
          titulo="Identidade visual"
          aberta={secaoAberta === 'visual'}
          onToggle={id => setSecaoAberta(secaoAberta === id ? '' : id)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                Cor principal
              </label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.cor_principal}
                  onChange={e => setForm(f => ({ ...f, cor_principal: e.target.value }))}
                  className="h-9 w-16 rounded cursor-pointer border"
                  style={{ borderColor: '#1F2B27' }} />
                <code className="text-xs" style={{ color: '#6B7280' }}>{form.cor_principal}</code>
              </div>
              <p className="text-xs mt-1" style={{ color: '#4B5563' }}>
                Tema inteiro gerado automaticamente a partir desta cor
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Fonte</label>
              <select value={form.fonte} onChange={set('fonte')}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }}>
                {['Plus Jakarta Sans', 'Inter', 'Nunito', 'Poppins', 'Roboto'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </Secao>

        {/* Seção: Agente IA */}
        <Secao
          id="agente"
          titulo="Agente IA"
          aberta={secaoAberta === 'agente'}
          onToggle={id => setSecaoAberta(secaoAberta === id ? '' : id)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Nome da IA" valor={form.agente_nome} onChange={set('agente_nome')} placeholder="Sofia, Dr. Virtual..." />
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Tom de voz</label>
                <select value={form.agente_tom} onChange={set('agente_tom')}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }}>
                  {['profissional e acolhedor','amigável e descontraído','empático e cuidadoso','formal e técnico','objetivo e direto']
                    .map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                Prompt da IA <span style={{ color: '#4B5563' }}>(pode completar depois em Configurações)</span>
              </label>
              <textarea value={form.agente_prompt} onChange={set('agente_prompt')} rows={6}
                placeholder={`Você é ${form.agente_nome}, assistente virtual da ${form.nome || 'clínica'}.\nServiços: ...\nHorários: ...\nRegras: ...`}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none font-mono"
                style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }} />
            </div>
          </div>
        </Secao>

        {/* Seção: Integrações */}
        <Secao
          id="integracoes"
          titulo="Integrações"
          aberta={secaoAberta === 'integracoes'}
          onToggle={id => setSecaoAberta(secaoAberta === id ? '' : id)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="OpenAI API Key" valor={form.openai_api_key} onChange={set('openai_api_key')} placeholder="sk-..." tipo="password" />
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Modelo OpenAI</label>
                <select value={form.openai_model} onChange={set('openai_model')}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }}>
                  {[
                    { value: 'gpt-4.1',      label: 'GPT-4.1 (Mais recente)' },
                    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Rápido e barato)' },
                    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (Ultra rápido)' },
                    { value: 'gpt-4o',       label: 'GPT-4o' },
                    { value: 'gpt-4o-mini',  label: 'GPT-4o Mini' },
                    { value: 'o3-mini',      label: 'o3-mini (Raciocínio)' },
                  ].map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: '#1F2B27' }}>
              <p className="text-xs font-medium mb-3" style={{ color: '#6B7280' }}>Evolution API (WhatsApp)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                    Nome da instância
                  </label>
                  <div className="flex gap-2">
                    <input type="text" value={form.evolution_instance} onChange={set('evolution_instance')}
                      placeholder="bella-vida"
                      className="flex-1 px-3 py-2 rounded-lg border text-sm font-mono"
                      style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }} />
                    <button type="button" onClick={gerarInstancia}
                      className="px-3 py-2 rounded-lg text-xs border transition-opacity hover:opacity-80"
                      style={{ borderColor: '#1F2B27', color: '#6B7280' }}>
                      Auto
                    </button>
                  </div>
                </div>
                <Campo label="URL da Evolution (deixe vazio p/ usar padrão)" valor={form.evolution_url} onChange={set('evolution_url')} placeholder="https://..." />
                <Campo label="API Key da Evolution (deixe vazio p/ usar padrão)" valor={form.evolution_api_key} onChange={set('evolution_api_key')} placeholder="Deixar vazio = usa a sua" tipo="password" />
              </div>
            </div>
          </div>
        </Secao>

        {/* Seção: Acesso */}
        <Secao
          id="acesso"
          titulo="Acesso do cliente"
          aberta={secaoAberta === 'acesso'}
          onToggle={id => setSecaoAberta(secaoAberta === id ? '' : id)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Email de acesso *" valor={form.email_admin} onChange={set('email_admin')} placeholder="dra.ana@clinicabella.com" tipo="email" />
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Senha *</label>
              <div className="flex gap-2">
                <input type="text" value={form.senha_admin} onChange={set('senha_admin')}
                  placeholder="Mínimo 8 caracteres"
                  className="flex-1 px-3 py-2 rounded-lg border text-sm font-mono"
                  style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }} />
                <button type="button" onClick={gerarSenha}
                  className="px-3 py-2 rounded-lg text-xs border transition-opacity hover:opacity-80"
                  style={{ borderColor: '#1F2B27', color: '#6B7280' }}>
                  Gerar
                </button>
              </div>
            </div>
          </div>
        </Secao>

        {/* Seção: Módulos */}
        <Secao
          id="modulos"
          titulo="Módulos ativos"
          aberta={secaoAberta === 'modulos'}
          onToggle={id => setSecaoAberta(secaoAberta === id ? '' : id)}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MODULOS.map(m => {
              const ativo = form.modulos_ativos.includes(m.id)
              const obrigatorio = m.id === 'dashboard'
              return (
                <button key={m.id} type="button"
                  onClick={() => toggleModulo(m.id)}
                  disabled={obrigatorio}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all"
                  style={{
                    background: ativo ? 'rgba(27,94,79,0.2)' : 'transparent',
                    borderColor: ativo ? '#1B5E4F' : '#1F2B27',
                    color: ativo ? '#2D8B73' : '#4B5563',
                  }}>
                  <div className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: ativo ? '#1B5E4F' : 'transparent', border: ativo ? 'none' : '1px solid #374151' }}>
                    {ativo && <Check size={9} className="text-white" />}
                  </div>
                  {m.label}
                </button>
              )
            })}
          </div>
        </Secao>

        {erro && (
          <div className="rounded-lg px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
            {erro}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={criando}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#1B5E4F' }}>
            {criando
              ? <><Loader2 size={15} className="animate-spin" /> Criando cliente...</>
              : 'Criar cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Secao({
  id, titulo, aberta, onToggle, children,
}: {
  id: string; titulo: string; aberta: boolean
  onToggle: (id: string) => void; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0F1511', borderColor: '#1F2B27' }}>
      <button type="button" onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: '#0F1511' }}>
        <span className="text-sm font-semibold text-white">{titulo}</span>
        {aberta
          ? <ChevronDown size={15} style={{ color: '#6B7280' }} />
          : <ChevronRight size={15} style={{ color: '#6B7280' }} />}
      </button>
      {aberta && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#1F2B27' }}>
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}

function Campo({
  label, valor, onChange, placeholder, tipo = 'text',
}: {
  label: string; valor: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; tipo?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>{label}</label>
      <input type={tipo} value={valor} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={{ background: '#0A0F0D', borderColor: '#1F2B27', color: '#E5E7EB' }} />
    </div>
  )
}

function CredencialItem({
  label, valor, chave, copiado, onCopiar,
}: {
  label: string; valor: string; chave: string
  copiado: string; onCopiar: (v: string, k: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
      style={{ background: '#0A0F0D', border: '1px solid #1F2B27' }}>
      <div className="min-w-0">
        <p className="text-xs mb-0.5" style={{ color: '#4B5563' }}>{label}</p>
        <p className="text-sm font-mono truncate" style={{ color: '#E5E7EB' }}>{valor}</p>
      </div>
      <button type="button" onClick={() => onCopiar(valor, chave)}
        className="flex-shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-80"
        style={{ color: copiado === chave ? '#22C55E' : '#6B7280' }}>
        {copiado === chave ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}
