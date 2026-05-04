'use client'

import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import type { ClinicaConfig, Clinica } from '@/types'

interface Props {
  config: ClinicaConfig
  clinica: Clinica
  onSalvar: (dados: Partial<ClinicaConfig>) => Promise<void>
}

const MODULOS = [
  { id: 'dashboard',    label: 'Dashboard',       desc: 'Visão geral com KPIs' },
  { id: 'crm',          label: 'CRM',             desc: 'Pipeline kanban de leads' },
  { id: 'whatsapp',     label: 'WhatsApp',        desc: 'Conversas e agente IA' },
  { id: 'agendamento',  label: 'Agendamento',     desc: 'Calendário de consultas' },
  { id: 'anti_noshow',  label: 'Anti No-Show',    desc: 'Confirmações automáticas' },
  { id: 'leads',        label: 'Leads',           desc: 'Tabela de leads' },
  { id: 'followup',     label: 'Follow-up',       desc: 'Cadência de reengajamento' },
  { id: 'nutricao',     label: 'Nutrição',        desc: 'Sequências para negociação' },
  { id: 'reaquecimento',label: 'Reaquecimento',   desc: 'Campanha para base inativa' },
  { id: 'ia_decisao',   label: 'IA Decisão',      desc: 'Análise estratégica por IA' },
  { id: 'relatorio',    label: 'Relatório',       desc: 'Relatório semanal automático' },
]

const LIMITES_PLANO: Record<string, { leads: number; contatos: number; mensagens: string }> = {
  entrada: { leads: 100, contatos: 500, mensagens: '1.000/mês' },
  medio:   { leads: 500, contatos: 2000, mensagens: '5.000/mês' },
  alto:    { leads: -1, contatos: -1, mensagens: 'Ilimitadas' },
}

export function AbaPlano({ config, clinica, onSalvar }: Props) {
  const [modulosAtivos, setModulosAtivos] = useState<string[]>(config.modulos_ativos ?? [])
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const plano = clinica.plano
  const limites = LIMITES_PLANO[plano] ?? LIMITES_PLANO.medio

  function toggleModulo(id: string) {
    // dashboard é obrigatório
    if (id === 'dashboard') return
    setModulosAtivos(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  async function handleSalvar() {
    setSalvando(true)
    setMensagem('')
    try {
      await onSalvar({ modulos_ativos: modulosAtivos })
      setMensagem('Módulos salvos!')
    } catch {
      setMensagem('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const nomes = { entrada: 'Entrada', medio: 'Médio', alto: 'Alto' }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Card do plano */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>Plano atual</p>
            <p className="text-xl font-bold" style={{ color: 'var(--cor-primaria)' }}>
              {nomes[plano] ?? plano}
            </p>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto)' }}>
            {clinica.ativo ? 'Ativo' : 'Inativo'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t" style={{ borderColor: 'var(--cor-borda)' }}>
          <div>
            <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>Leads</p>
            <p className="font-semibold text-sm" style={{ color: 'var(--cor-texto)' }}>
              {limites.leads === -1 ? 'Ilimitados' : limites.leads}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>Contatos</p>
            <p className="font-semibold text-sm" style={{ color: 'var(--cor-texto)' }}>
              {limites.contatos === -1 ? 'Ilimitados' : limites.contatos}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>Mensagens</p>
            <p className="font-semibold text-sm" style={{ color: 'var(--cor-texto)' }}>{limites.mensagens}</p>
          </div>
        </div>

        <p className="text-xs mt-4" style={{ color: 'var(--cor-texto-suave)' }}>
          Para alterar o plano, entre em contato com o suporte Opus Clínicas.
        </p>
      </div>

      {/* Módulos */}
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--cor-texto)' }}>
          Módulos ativos
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--cor-texto-suave)' }}>
          Ative ou desative módulos do sistema para esta clínica.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODULOS.map(m => {
            const ativo = modulosAtivos.includes(m.id)
            const obrigatorio = m.id === 'dashboard'
            return (
              <button
                key={m.id}
                onClick={() => toggleModulo(m.id)}
                disabled={obrigatorio}
                className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                style={{
                  borderColor: ativo ? 'var(--cor-primaria)' : 'var(--cor-borda)',
                  background: ativo ? 'var(--cor-fundo)' : 'var(--cor-card)',
                  opacity: obrigatorio ? 0.7 : 1,
                }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    background: ativo ? 'var(--cor-primaria)' : 'transparent',
                    border: ativo ? 'none' : '2px solid var(--cor-borda)',
                  }}
                >
                  {ativo && <Check size={11} className="text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>{m.label}</p>
                  <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{m.desc}</p>
                </div>
              </button>
            )
          })}
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
        {salvando ? 'Salvando...' : 'Salvar módulos'}
      </button>
    </div>
  )
}
