'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Contato } from '@/types'

export default function NovoLeadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [buscaTelefone, setBuscaTelefone] = useState('')
  const [contatoEncontrado, setContatoEncontrado] = useState<Contato | null>(null)
  const [buscando, setBuscando] = useState(false)

  const [form, setForm] = useState({
    contato_nome:     '',
    contato_telefone: '',
    servico:          '',
    valor_estimado:   '',
    origem:           'manual',
    temperatura:      'morno' as 'quente' | 'morno' | 'frio',
  })

  useEffect(() => {
    const tel = buscaTelefone.replace(/\D/g, '')
    if (tel.length < 10) { setContatoEncontrado(null); return }

    const t = setTimeout(async () => {
      setBuscando(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setBuscando(false); return }

      const { data: uc } = await supabase
        .from('usuarios_clinicas')
        .select('clinica_id')
        .eq('user_id', user.id)
        .single()

      if (!uc) { setBuscando(false); return }

      const { data: contato } = await supabase
        .from('contatos')
        .select('*')
        .eq('clinica_id', uc.clinica_id)
        .ilike('telefone', `%${tel}%`)
        .maybeSingle()

      setContatoEncontrado(contato ?? null)
      if (contato) {
        setForm(p => ({ ...p, contato_nome: contato.nome, contato_telefone: contato.telefone }))
      }
      setBuscando(false)
    }, 500)

    return () => clearTimeout(t)
  }, [buscaTelefone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.servico.trim()) { toast.error('Informe o serviço'); return }
    if (!contatoEncontrado && (!form.contato_nome || !form.contato_telefone)) {
      toast.error('Informe nome e telefone do contato')
      return
    }

    setLoading(true)

    const payload = contatoEncontrado
      ? {
          contato_id:     contatoEncontrado.id,
          servico:        form.servico,
          valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
          origem:         form.origem,
          temperatura:    form.temperatura,
        }
      : {
          contato_nome:     form.contato_nome,
          contato_telefone: form.contato_telefone,
          servico:          form.servico,
          valor_estimado:   form.valor_estimado ? Number(form.valor_estimado) : null,
          origem:           form.origem,
          temperatura:      form.temperatura,
        }

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)
    if (res.ok) {
      toast.success('Lead criado!')
      router.push('/crm')
    } else {
      const json = await res.json()
      toast.error(json.error ?? 'Erro ao criar lead')
    }
  }

  const inputClass = "w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-all"
  const inputStyle: React.CSSProperties = {
    background: 'var(--cor-fundo)',
    border: '1px solid var(--cor-borda)',
    color: 'var(--cor-texto)',
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/crm"
          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <ArrowLeft size={16} style={{ color: 'var(--cor-texto)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--cor-texto)' }}>Novo Lead</h1>
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Adicione um lead ao pipeline</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seção contato */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cor-texto)' }}>Contato</h2>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cor-texto-suave)' }}>
              Buscar por telefone
            </label>
            <input
              type="tel"
              value={buscaTelefone}
              onChange={e => setBuscaTelefone(e.target.value)}
              placeholder="(86) 99999-9999"
              className={inputClass}
              style={inputStyle}
            />
            {buscando && (
              <p className="text-xs mt-1" style={{ color: 'var(--cor-texto-suave)' }}>Buscando…</p>
            )}
            {!buscando && contatoEncontrado && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: '#22C55E' }}>
                ✓ {contatoEncontrado.nome} encontrado
              </p>
            )}
            {!buscando && !contatoEncontrado && buscaTelefone.replace(/\D/g, '').length >= 10 && (
              <p className="text-xs mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
                Contato não encontrado — preencha abaixo para criar
              </p>
            )}
          </div>

          {!contatoEncontrado && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cor-texto-suave)' }}>Nome *</label>
                <input
                  type="text"
                  value={form.contato_nome}
                  onChange={e => setForm(p => ({ ...p, contato_nome: e.target.value }))}
                  placeholder="Nome completo"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cor-texto-suave)' }}>Telefone *</label>
                <input
                  type="tel"
                  value={form.contato_telefone}
                  onChange={e => setForm(p => ({ ...p, contato_telefone: e.target.value }))}
                  placeholder="(86) 99999-9999"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </>
          )}
        </div>

        {/* Seção lead */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cor-texto)' }}>Informações do Lead</h2>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cor-texto-suave)' }}>Serviço *</label>
            <input
              type="text"
              value={form.servico}
              onChange={e => setForm(p => ({ ...p, servico: e.target.value }))}
              placeholder="Ex: Botox facial, Harmonização…"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cor-texto-suave)' }}>Valor Estimado (R$)</label>
            <input
              type="number"
              value={form.valor_estimado}
              onChange={e => setForm(p => ({ ...p, valor_estimado: e.target.value }))}
              placeholder="0,00"
              min="0"
              step="0.01"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cor-texto-suave)' }}>Origem</label>
              <select
                value={form.origem}
                onChange={e => setForm(p => ({ ...p, origem: e.target.value }))}
                className={inputClass + ' appearance-none'}
                style={inputStyle}
              >
                {['manual','Instagram','WhatsApp','Indicação','Google','Site','Facebook'].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cor-texto-suave)' }}>Temperatura</label>
              <select
                value={form.temperatura}
                onChange={e => setForm(p => ({ ...p, temperatura: e.target.value as typeof form.temperatura }))}
                className={inputClass + ' appearance-none'}
                style={inputStyle}
              >
                <option value="quente">🔥 Quente</option>
                <option value="morno">🌡 Morno</option>
                <option value="frio">❄ Frio</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--cor-primaria)' }}
        >
          {loading ? 'Criando…' : 'Criar Lead'}
        </button>
      </form>
    </div>
  )
}
