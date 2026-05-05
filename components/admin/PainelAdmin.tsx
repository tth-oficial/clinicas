'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ExternalLink, Wifi, WifiOff, Check, X,
  ChevronDown, ChevronUp, Settings,
} from 'lucide-react'

interface ClienteItem {
  id: string
  nome: string
  responsavel: string
  especialidade: string
  cidade: string
  plano: string
  ativo: boolean
  criado_em: string
  cor_principal: string
  nome_exibicao: string
  agente_nome: string
  evolution_instance: string | null
  tem_openai: boolean
  atualizado_em: string
  total_usuarios: number
}

const PLANO_COR: Record<string, string> = {
  entrada: '#6366F1',
  medio:   '#2D8B73',
  alto:    '#F59E0B',
}

export function PainelAdmin({ clinicas }: { clinicas: ClienteItem[] }) {
  const [expandido, setExpandido] = useState<string | null>(null)
  const [desativando, setDesativando] = useState<string | null>(null)

  async function handleToggleAtivo(id: string, ativo: boolean) {
    setDesativando(id)
    try {
      await fetch(`/api/admin/clinicas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !ativo }),
      })
      window.location.reload()
    } finally {
      setDesativando(null)
    }
  }

  if (clinicas.length === 0) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ background: '#0F1511', borderColor: '#1F2B27' }}>
        <p className="text-sm" style={{ color: '#6B7280' }}>Nenhum cliente ainda.</p>
        <Link href="/admin/novo-cliente"
          className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#1B5E4F' }}>
          Criar primeiro cliente
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {clinicas.map(c => (
        <div key={c.id}
          className="rounded-xl border overflow-hidden transition-all"
          style={{
            background: '#0F1511',
            borderColor: expandido === c.id ? c.cor_principal : '#1F2B27',
          }}>
          {/* Linha principal */}
          <div className="flex items-center gap-4 px-4 py-3">
            {/* Cor da clínica */}
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-xs"
              style={{ background: c.cor_principal }}>
              {c.nome_exibicao.charAt(0).toUpperCase()}
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-white truncate">{c.nome_exibicao}</span>
                {!c.ativo && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                    Inativa
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{ background: `${PLANO_COR[c.plano] ?? '#6B7280'}20`, color: PLANO_COR[c.plano] ?? '#6B7280' }}>
                  {c.plano}
                </span>
              </div>
              <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280' }}>
                {c.responsavel && `${c.responsavel} · `}{c.cidade}
              </p>
            </div>

            {/* Status badges */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1 text-xs"
                style={{ color: c.evolution_instance ? '#22C55E' : '#4B5563' }}>
                {c.evolution_instance
                  ? <Wifi size={12} />
                  : <WifiOff size={12} />
                }
                <span className="hidden md:inline">WhatsApp</span>
              </div>

              <div className="flex items-center gap-1 text-xs"
                style={{ color: c.tem_openai ? '#22C55E' : '#4B5563' }}>
                {c.tem_openai
                  ? <Check size={12} />
                  : <X size={12} />
                }
                <span className="hidden md:inline">IA</span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link
                href={`/admin/cliente/${c.id}`}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: '#6B7280' }}
                title="Editar cliente"
              >
                <Settings size={14} />
              </Link>

              <a
                href={`/dashboard`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: '#6B7280' }}
                title="Abrir sistema do cliente"
              >
                <ExternalLink size={14} />
              </a>

              <button
                onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: '#6B7280' }}
              >
                {expandido === c.id
                  ? <ChevronUp size={14} />
                  : <ChevronDown size={14} />
                }
              </button>
            </div>
          </div>

          {/* Painel expandido */}
          {expandido === c.id && (
            <div className="px-4 pb-4 pt-1 border-t space-y-4" style={{ borderColor: '#1F2B27' }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InfoItem label="Agente IA" valor={c.agente_nome} />
                <InfoItem label="Especialidade" valor={c.especialidade || '—'} />
                <InfoItem label="Instância WA" valor={c.evolution_instance || 'Não configurado'} />
                <InfoItem label="Usuários" valor={String(c.total_usuarios)} />
              </div>

              <div className="flex items-center gap-2 text-xs" style={{ color: '#4B5563' }}>
                <span>ID: <code className="font-mono" style={{ color: '#6B7280' }}>{c.id}</code></span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/admin/cliente/${c.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: '#1B5E4F' }}
                >
                  <Settings size={12} /> Editar configurações
                </Link>

                <button
                  onClick={() => handleToggleAtivo(c.id, c.ativo)}
                  disabled={desativando === c.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{
                    background: c.ativo ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    color: c.ativo ? '#EF4444' : '#22C55E',
                    border: `1px solid ${c.ativo ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                  }}
                >
                  {desativando === c.id ? 'Aguarde...' : c.ativo ? 'Desativar cliente' : 'Reativar cliente'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function InfoItem({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: '#4B5563' }}>{label}</p>
      <p className="text-xs font-medium truncate" style={{ color: '#9CA3AF' }}>{valor}</p>
    </div>
  )
}
