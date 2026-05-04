'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, ChevronRight, Upload } from 'lucide-react'

type Passo = 1 | 2 | 3 | 4

interface FormDados {
  nome: string
  responsavel: string
  cidade: string
  especialidade: string
  whatsapp: string
  agente_nome: string
  agente_prompt: string
  agente_tom: string
}

const PASSOS = [
  { id: 1, label: 'Dados da clínica' },
  { id: 2, label: 'Agente IA' },
  { id: 3, label: 'WhatsApp' },
  { id: 4, label: 'Importar contatos' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [passo, setPasso] = useState<Passo>(1)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<FormDados>({
    nome: '',
    responsavel: '',
    cidade: '',
    especialidade: '',
    whatsapp: '',
    agente_nome: 'Assistente',
    agente_prompt: '',
    agente_tom: 'profissional e acolhedor',
  })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [importMensagem, setImportMensagem] = useState('')

  function set(k: keyof FormDados) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function salvarDados() {
    setSalvando(true)
    try {
      await fetch('/api/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } finally {
      setSalvando(false)
    }
  }

  async function avancar() {
    if (passo === 1 || passo === 2) {
      await salvarDados()
    }
    if (passo < 4) {
      setPasso(p => (p + 1) as Passo)
    } else {
      router.push('/dashboard')
    }
  }

  async function handleImportarCSV() {
    if (!csvFile) return
    setImportando(true)
    setImportMensagem('')
    try {
      const fd = new FormData()
      fd.append('csv', csvFile)
      const res = await fetch('/api/contatos/importar', { method: 'POST', body: fd })
      const data = await res.json() as { importados?: number; erro?: string }
      if (data.importados !== undefined) {
        setImportMensagem(`${data.importados} contatos importados com sucesso!`)
      } else {
        setImportMensagem(data.erro ?? 'Erro na importação')
      }
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--cor-fundo)' }}>
      <div className="w-full max-w-lg">
        {/* Progresso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {PASSOS.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 flex-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: passo > p.id ? '#22C55E' : passo === p.id ? 'var(--cor-primaria)' : 'var(--cor-borda)',
                    color: passo >= p.id ? '#fff' : 'var(--cor-texto-suave)',
                  }}
                >
                  {passo > p.id ? <Check size={12} /> : p.id}
                </div>
                {i < PASSOS.length - 1 && (
                  <div className="h-0.5 flex-1 mx-1" style={{ background: passo > p.id ? '#22C55E' : 'var(--cor-borda)' }} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm font-medium" style={{ color: 'var(--cor-texto-suave)' }}>
            Passo {passo} de 4 — {PASSOS[passo - 1].label}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-6 space-y-5" style={{ background: 'var(--cor-card)', borderColor: 'var(--cor-borda)' }}>

          {/* Passo 1 */}
          {passo === 1 && (
            <>
              <h2 className="text-lg font-bold" style={{ color: 'var(--cor-texto)' }}>Dados da clínica</h2>
              <div className="space-y-4">
                {([
                  { key: 'nome', label: 'Nome da clínica', placeholder: 'Ex: Clínica Estética Bella' },
                  { key: 'responsavel', label: 'Nome do responsável', placeholder: 'Ex: Dra. Ana Lima' },
                  { key: 'especialidade', label: 'Especialidade', placeholder: 'Ex: Estética, Odontologia, Fisioterapia' },
                  { key: 'cidade', label: 'Cidade', placeholder: 'Ex: Teresina, PI' },
                  { key: 'whatsapp', label: 'WhatsApp da clínica', placeholder: 'Ex: 5586999999999' },
                ] as { key: keyof FormDados; label: string; placeholder: string }[]).map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>{f.label}</label>
                    <input type="text" value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-fundo)' }} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Passo 2 */}
          {passo === 2 && (
            <>
              <h2 className="text-lg font-bold" style={{ color: 'var(--cor-texto)' }}>Configure o agente IA</h2>
              <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
                O agente responderá automaticamente pelo WhatsApp da clínica.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>Nome do agente</label>
                  <input type="text" value={form.agente_nome} onChange={set('agente_nome')} placeholder="Ex: Sofia"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-fundo)' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>Tom de voz</label>
                  <select value={form.agente_tom} onChange={set('agente_tom')}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-fundo)' }}>
                    {['profissional e acolhedor','formal e técnico','amigável e descontraído','empático e cuidadoso','objetivo e direto']
                      .map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>Prompt do agente</label>
                  <textarea value={form.agente_prompt} onChange={set('agente_prompt')} rows={6}
                    placeholder={`Você é ${form.agente_nome || 'o assistente'} da ${form.nome || 'clínica'}. Você ajuda pacientes a agendar consultas e tirar dúvidas...`}
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-fundo)' }} />
                </div>
              </div>
            </>
          )}

          {/* Passo 3 */}
          {passo === 3 && (
            <>
              <h2 className="text-lg font-bold" style={{ color: 'var(--cor-texto)' }}>Conectar WhatsApp</h2>
              <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
                Você pode conectar o WhatsApp agora ou depois em{' '}
                <span style={{ color: 'var(--cor-primaria)' }}>Configurações → WhatsApp</span>.
              </p>
              <div className="rounded-xl border p-4 text-center space-y-3"
                style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-fundo)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>
                  Configure a instância WhatsApp nas configurações após finalizar o onboarding.
                </p>
                <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
                  Você precisará das credenciais da Evolution API (URL, API Key e nome da instância).
                </p>
              </div>
            </>
          )}

          {/* Passo 4 */}
          {passo === 4 && (
            <>
              <h2 className="text-lg font-bold" style={{ color: 'var(--cor-texto)' }}>Importar contatos</h2>
              <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
                Opcional — importe sua base de pacientes via CSV. Formato: <code className="text-xs px-1 rounded" style={{ background: 'var(--cor-fundo)' }}>nome,telefone,email</code>
              </p>
              <div className="space-y-4">
                <label
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-opacity hover:opacity-80"
                  style={{ borderColor: 'var(--cor-borda)' }}
                >
                  <Upload size={24} style={{ color: 'var(--cor-texto-suave)' }} />
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>
                      {csvFile ? csvFile.name : 'Clique para selecionar o CSV'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
                      Máximo 10.000 contatos
                    </p>
                  </div>
                  <input type="file" accept=".csv" className="hidden"
                    onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
                </label>

                {csvFile && (
                  <button onClick={handleImportarCSV} disabled={importando}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'var(--cor-primaria)' }}>
                    {importando && <Loader2 size={14} className="animate-spin" />}
                    {importando ? 'Importando...' : 'Importar agora'}
                  </button>
                )}

                {importMensagem && (
                  <p className="text-sm" style={{ color: importMensagem.includes('ucesso') ? '#22C55E' : '#EF4444' }}>
                    {importMensagem}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between pt-2">
            {passo > 1 ? (
              <button
                onClick={() => setPasso(p => (p - 1) as Passo)}
                className="text-sm px-4 py-2 rounded-lg border transition-opacity hover:opacity-80"
                style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)' }}
              >
                Voltar
              </button>
            ) : <div />}

            <button
              onClick={avancar}
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--cor-primaria)' }}
            >
              {salvando && <Loader2 size={14} className="animate-spin" />}
              {passo === 4 ? 'Finalizar' : (
                <>
                  {passo === 3 ? 'Pular' : 'Continuar'}
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
