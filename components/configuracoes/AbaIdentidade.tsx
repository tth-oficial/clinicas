'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import type { ClinicaConfig, Clinica } from '@/types'

interface Props {
  config: ClinicaConfig
  clinica: Clinica
  onSalvar: (dados: Partial<ClinicaConfig & Clinica>) => Promise<void>
}

export function AbaIdentidade({ config, clinica, onSalvar }: Props) {
  const [form, setForm] = useState({
    nome: clinica.nome,
    nome_exibicao: config.nome_exibicao ?? '',
    slogan: config.slogan ?? '',
    cidade: clinica.cidade ?? '',
    responsavel: clinica.responsavel ?? '',
    cor_principal: config.cor_principal,
    fonte: config.fonte,
    logo_url: config.logo_url ?? '',
  })
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadando(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/configuracoes/logo', { method: 'POST', body: fd })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        setForm(f => ({ ...f, logo_url: data.url! }))
        setMensagem('Logo enviado com sucesso!')
      } else {
        setMensagem(data.error ?? 'Erro no upload')
      }
    } finally {
      setUploadando(false)
    }
  }

  async function handleSalvar() {
    setSalvando(true)
    setMensagem('')
    try {
      await onSalvar(form)
      setMensagem('Configurações salvas!')
    } catch {
      setMensagem('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const fontes = ['Plus Jakarta Sans', 'Inter', 'Nunito', 'Poppins', 'Roboto']

  return (
    <div className="space-y-6 max-w-xl">
      {/* Logo */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--cor-texto)' }}>
          Logo da clínica
        </label>
        <div className="flex items-center gap-4">
          {form.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo_url} alt="Logo" className="h-14 w-auto object-contain rounded-lg border p-1"
              style={{ borderColor: 'var(--cor-borda)' }} />
          ) : (
            <div className="h-14 w-24 rounded-lg border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: 'var(--cor-borda)' }}>
              <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>Sem logo</span>
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadando}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)' }}
          >
            {uploadando ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploadando ? 'Enviando...' : 'Enviar logo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nome da clínica" value={form.nome}
          onChange={v => setForm(f => ({ ...f, nome: v }))} />
        <Campo label="Nome de exibição" value={form.nome_exibicao}
          onChange={v => setForm(f => ({ ...f, nome_exibicao: v }))} placeholder="Ex: Clínica Bela Vida" />
        <Campo label="Slogan" value={form.slogan}
          onChange={v => setForm(f => ({ ...f, slogan: v }))} placeholder="Ex: Sua beleza, nosso cuidado" />
        <Campo label="Cidade" value={form.cidade}
          onChange={v => setForm(f => ({ ...f, cidade: v }))} />
        <Campo label="Responsável" value={form.responsavel}
          onChange={v => setForm(f => ({ ...f, responsavel: v }))} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
            Cor principal
          </label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.cor_principal}
              onChange={e => setForm(f => ({ ...f, cor_principal: e.target.value }))}
              className="h-9 w-16 rounded cursor-pointer border" style={{ borderColor: 'var(--cor-borda)' }} />
            <span className="text-sm font-mono" style={{ color: 'var(--cor-texto-suave)' }}>{form.cor_principal}</span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
            Todas as outras cores são geradas automaticamente
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
            Fonte
          </label>
          <select value={form.fonte} onChange={e => setForm(f => ({ ...f, fonte: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}>
            {fontes.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {mensagem && (
        <p className="text-sm" style={{ color: mensagem.includes('Erro') ? '#EF4444' : '#22C55E' }}>
          {mensagem}
        </p>
      )}

      <button onClick={handleSalvar} disabled={salvando}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--cor-primaria)' }}>
        {salvando && <Loader2 size={14} className="animate-spin" />}
        {salvando ? 'Salvando...' : 'Salvar identidade'}
      </button>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }} />
    </div>
  )
}
