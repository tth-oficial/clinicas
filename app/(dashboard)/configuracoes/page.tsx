'use client'

import { useState, useEffect } from 'react'
import {
  Palette, Bot, MessageSquare, Zap, Link2, CreditCard, Loader2
} from 'lucide-react'
import { AbaIdentidade } from '@/components/configuracoes/AbaIdentidade'
import { AbaAgenteIA } from '@/components/configuracoes/AbaAgenteIA'
import { AbaWhatsApp } from '@/components/configuracoes/AbaWhatsApp'
import { AbaAutomacoes } from '@/components/configuracoes/AbaAutomacoes'
import { AbaIntegracoes } from '@/components/configuracoes/AbaIntegracoes'
import { AbaPlano } from '@/components/configuracoes/AbaPlano'
import type { ClinicaConfig, Clinica } from '@/types'

type Aba = 'identidade' | 'agente' | 'whatsapp' | 'automacoes' | 'integracoes' | 'plano'

interface DadosConfig extends ClinicaConfig {
  clinica: Clinica
}

const ABAS: { id: Aba; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'identidade',   label: 'Identidade',    Icon: Palette },
  { id: 'agente',       label: 'Agente IA',     Icon: Bot },
  { id: 'whatsapp',     label: 'WhatsApp',      Icon: MessageSquare },
  { id: 'automacoes',   label: 'Automações',    Icon: Zap },
  { id: 'integracoes',  label: 'Integrações',   Icon: Link2 },
  { id: 'plano',        label: 'Plano',         Icon: CreditCard },
]

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('identidade')
  const [dados, setDados] = useState<DadosConfig | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(r => r.json())
      .then((d: DadosConfig) => setDados(d))
      .finally(() => setCarregando(false))
  }, [])

  async function salvar(update: Record<string, unknown>) {
    const res = await fetch('/api/configuracoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    if (!res.ok) {
      const err = await res.json() as { error?: string }
      throw new Error(err.error ?? 'Erro')
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--cor-texto-suave)' }}>
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Carregando configurações...</span>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#EF4444' }}>Erro ao carregar configurações.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {ABAS.map(({ id, label, Icon }) => {
          const ativo = abaAtiva === id
          return (
            <button
              key={id}
              onClick={() => setAbaAtiva(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: ativo ? 'var(--cor-primaria)' : 'var(--cor-card)',
                color: ativo ? '#fff' : 'var(--cor-texto)',
                border: ativo ? 'none' : '1px solid var(--cor-borda)',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Conteúdo da aba */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: 'var(--cor-card)', borderColor: 'var(--cor-borda)' }}
      >
        {abaAtiva === 'identidade' && (
          <AbaIdentidade
            config={dados}
            clinica={dados.clinica}
            onSalvar={salvar}
          />
        )}
        {abaAtiva === 'agente' && (
          <AbaAgenteIA
            config={dados}
            onSalvar={salvar}
          />
        )}
        {abaAtiva === 'whatsapp' && (
          <AbaWhatsApp clinicaId={dados.clinica_id} />
        )}
        {abaAtiva === 'automacoes' && (
          <AbaAutomacoes
            onSalvar={async (templates) => {
              await salvar({ templates_cadencias: templates })
            }}
          />
        )}
        {abaAtiva === 'integracoes' && (
          <AbaIntegracoes
            config={dados}
            onSalvar={salvar}
          />
        )}
        {abaAtiva === 'plano' && (
          <AbaPlano
            config={dados}
            clinica={dados.clinica}
            onSalvar={salvar}
          />
        )}
      </div>
    </div>
  )
}
