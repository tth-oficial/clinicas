'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import type { ClinicaConfig } from '@/types'

interface Props {
  config: ClinicaConfig
  onSalvar: (dados: Partial<ClinicaConfig>) => Promise<void>
}

export function AbaIntegracoes({ config, onSalvar }: Props) {
  const [form, setForm] = useState({
    openai_api_key: config.openai_api_key ?? '',
    openai_model: config.openai_model ?? 'gpt-4o',
    evolution_url: config.evolution_url ?? '',
    evolution_api_key: config.evolution_api_key ?? '',
    evolution_instance: config.evolution_instance ?? '',
    google_calendar_id: config.google_calendar_id ?? '',
  })
  const [mostrarOpenAI, setMostrarOpenAI] = useState(false)
  const [mostrarEvolution, setMostrarEvolution] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const modelos = [
    { value: 'gpt-4.1',      label: 'GPT-4.1 (Mais recente)' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Rápido e barato)' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (Ultra rápido)' },
    { value: 'gpt-4o',       label: 'GPT-4o' },
    { value: 'gpt-4o-mini',  label: 'GPT-4o Mini' },
    { value: 'o3-mini',      label: 'o3-mini (Raciocínio)' },
  ]

  async function handleSalvar() {
    setSalvando(true)
    setMensagem('')
    try {
      await onSalvar(form)
      setMensagem('Integrações salvas!')
    } catch {
      setMensagem('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const eMascarado = (v: string) => v.startsWith('••••')

  return (
    <div className="space-y-8 max-w-xl">
      {/* OpenAI */}
      <section>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--cor-texto)' }}>
          OpenAI
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
              API Key
            </label>
            <div className="relative">
              <input
                type={mostrarOpenAI ? 'text' : 'password'}
                value={form.openai_api_key}
                onChange={e => setForm(f => ({ ...f, openai_api_key: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 rounded-lg border text-sm font-mono"
                style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
              />
              <button
                type="button"
                onClick={() => setMostrarOpenAI(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--cor-texto-suave)' }}
              >
                {mostrarOpenAI ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {eMascarado(form.openai_api_key) && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#22C55E' }}>
                <Check size={11} /> API Key configurada
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
              Modelo
            </label>
            <select value={form.openai_model} onChange={e => setForm(f => ({ ...f, openai_model: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}>
              {modelos.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Evolution API */}
      <section>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--cor-texto)' }}>
          Evolution API (WhatsApp)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
              URL da Evolution
            </label>
            <input type="url" value={form.evolution_url}
              onChange={e => setForm(f => ({ ...f, evolution_url: e.target.value }))}
              placeholder="https://evolution.suaempresa.com"
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
              style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
              API Key da Evolution
            </label>
            <div className="relative">
              <input
                type={mostrarEvolution ? 'text' : 'password'}
                value={form.evolution_api_key}
                onChange={e => setForm(f => ({ ...f, evolution_api_key: e.target.value }))}
                placeholder="Sua API key"
                className="w-full px-3 py-2 pr-10 rounded-lg border text-sm font-mono"
                style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
              />
              <button type="button" onClick={() => setMostrarEvolution(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--cor-texto-suave)' }}>
                {mostrarEvolution ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {eMascarado(form.evolution_api_key) && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#22C55E' }}>
                <Check size={11} /> API Key configurada
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
              Nome da instância
            </label>
            <input type="text" value={form.evolution_instance}
              onChange={e => setForm(f => ({ ...f, evolution_instance: e.target.value }))}
              placeholder="clinica-nome"
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
              style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }} />
          </div>
        </div>
      </section>

      {/* Google Calendar */}
      <section>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--cor-texto)' }}>
          Google Calendar
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--cor-texto-suave)' }}>
          Sincronize agendamentos automaticamente com o Google Calendar da clínica.
        </p>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
            ID do Calendário
          </label>
          <input type="text" value={form.google_calendar_id}
            onChange={e => setForm(f => ({ ...f, google_calendar_id: e.target.value }))}
            placeholder="nome@group.calendar.google.com"
            className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
            style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }} />
        </div>
      </section>

      {mensagem && (
        <p className="text-sm" style={{ color: mensagem.includes('Erro') ? '#EF4444' : '#22C55E' }}>
          {mensagem}
        </p>
      )}

      <button onClick={handleSalvar} disabled={salvando}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--cor-primaria)' }}>
        {salvando && <Loader2 size={14} className="animate-spin" />}
        {salvando ? 'Salvando...' : 'Salvar integrações'}
      </button>
    </div>
  )
}
