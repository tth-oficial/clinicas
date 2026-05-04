'use client'

import { useState } from 'react'
import { Loader2, Send, Bot } from 'lucide-react'
import type { ClinicaConfig } from '@/types'

interface Props {
  config: ClinicaConfig
  onSalvar: (dados: Partial<ClinicaConfig>) => Promise<void>
}

interface MensagemChat {
  de: 'usuario' | 'agente'
  texto: string
}

export function AbaAgenteIA({ config, onSalvar }: Props) {
  const [form, setForm] = useState({
    agente_nome: config.agente_nome,
    agente_prompt: config.agente_prompt ?? '',
    agente_tom: config.agente_tom,
  })
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const [chatMensagens, setChatMensagens] = useState<MensagemChat[]>([])
  const [inputChat, setInputChat] = useState('')
  const [testando, setTestando] = useState(false)

  const toms = [
    'profissional e acolhedor',
    'formal e técnico',
    'amigável e descontraído',
    'empático e cuidadoso',
    'objetivo e direto',
  ]

  async function handleSalvar() {
    setSalvando(true)
    setMensagem('')
    try {
      await onSalvar(form)
      setMensagem('Agente salvo!')
    } catch {
      setMensagem('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function handleTestar() {
    if (!inputChat.trim()) return
    const pergunta = inputChat.trim()
    setInputChat('')
    setChatMensagens(m => [...m, { de: 'usuario', texto: pergunta }])
    setTestando(true)

    try {
      const res = await fetch('/api/agente/testar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: pergunta,
          agentePrompt: form.agente_prompt,
          agenteTom: form.agente_tom,
          agenteNome: form.agente_nome,
        }),
      })
      const data = await res.json() as { resposta?: string; error?: string }
      setChatMensagens(m => [...m, {
        de: 'agente',
        texto: data.resposta ?? data.error ?? 'Sem resposta',
      }])
    } catch {
      setChatMensagens(m => [...m, { de: 'agente', texto: 'Erro ao testar o agente.' }])
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Configurações */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
            Nome do agente
          </label>
          <input type="text" value={form.agente_nome}
            onChange={e => setForm(f => ({ ...f, agente_nome: e.target.value }))}
            placeholder="Ex: Sofia, Dr. Virtual, Assistente"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
            Tom de voz
          </label>
          <select value={form.agente_tom} onChange={e => setForm(f => ({ ...f, agente_tom: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}>
            {toms.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
            Prompt do sistema
          </label>
          <p className="text-xs mb-2" style={{ color: 'var(--cor-texto-suave)' }}>
            Descreva quem é o agente, o que ele faz, quais serviços oferece, e como deve se comportar.
          </p>
          <textarea value={form.agente_prompt}
            onChange={e => setForm(f => ({ ...f, agente_prompt: e.target.value }))}
            rows={10}
            placeholder="Você é [nome], assistente virtual da [clínica]. Você ajuda pacientes a agendar consultas, tirar dúvidas sobre procedimentos..."
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none font-mono"
            style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }} />
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
          {salvando ? 'Salvando...' : 'Salvar agente'}
        </button>
      </div>

      {/* Chat de teste */}
      <div className="flex flex-col" style={{ minHeight: 400 }}>
        <div className="flex items-center gap-2 mb-3">
          <Bot size={16} style={{ color: 'var(--cor-primaria)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>
            Chat de teste — simula o agente sem WhatsApp
          </span>
        </div>

        <div className="flex-1 rounded-xl border p-4 space-y-3 overflow-y-auto"
          style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-fundo)', minHeight: 280, maxHeight: 360 }}>
          {chatMensagens.length === 0 && (
            <p className="text-sm text-center pt-8" style={{ color: 'var(--cor-texto-suave)' }}>
              Envie uma mensagem para testar o agente com o prompt atual
            </p>
          )}
          {chatMensagens.map((msg, i) => (
            <div key={i} className={`flex ${msg.de === 'usuario' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[80%] rounded-2xl px-4 py-2 text-sm"
                style={{
                  background: msg.de === 'usuario' ? 'var(--cor-primaria)' : 'var(--cor-card)',
                  color: msg.de === 'usuario' ? '#fff' : 'var(--cor-texto)',
                  border: msg.de === 'agente' ? '1px solid var(--cor-borda)' : 'none',
                }}
              >
                {msg.texto}
              </div>
            </div>
          ))}
          {testando && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2 text-sm flex items-center gap-2"
                style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto-suave)' }}>
                <Loader2 size={12} className="animate-spin" /> Digitando...
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={inputChat}
            onChange={e => setInputChat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleTestar()}
            placeholder="Digite uma mensagem de teste..."
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
          />
          <button onClick={handleTestar} disabled={testando || !inputChat.trim()}
            className="px-3 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--cor-primaria)' }}>
            <Send size={15} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
