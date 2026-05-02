'use client'

import { useState } from 'react'
import { Bot, User, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AgenteStatusProps {
  conversaId: string
  agenteAtivo: boolean
  onToggle?: (novoStatus: boolean) => void
}

export function AgenteStatus({
  conversaId,
  agenteAtivo,
  onToggle,
}: AgenteStatusProps) {
  const [ativo, setAtivo] = useState(agenteAtivo)
  const [carregando, setCarregando] = useState(false)

  const supabase = createClient()

  async function toggleAgente() {
    setCarregando(true)
    const novoStatus = !ativo

    try {
      const { error } = await supabase
        .from('conversas')
        .update({ agente_ativo: novoStatus })
        .eq('id', conversaId)

      if (error) throw error

      setAtivo(novoStatus)
      onToggle?.(novoStatus)

      toast.success(
        novoStatus
          ? 'IA reativada — Luna voltará a responder'
          : 'Humano assumiu — Luna pausada'
      )
    } catch (err) {
      console.error('[AgenteStatus] Erro ao alternar agente', err)
      toast.error('Erro ao alterar status do agente')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Badge de status */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{
          background: ativo
            ? 'rgba(34, 197, 94, 0.12)'
            : 'rgba(249, 115, 22, 0.12)',
          color: ativo ? '#16a34a' : '#ea580c',
        }}
      >
        {ativo ? (
          <Bot size={12} className="shrink-0" />
        ) : (
          <User size={12} className="shrink-0" />
        )}
        <span>{ativo ? 'IA Ativa' : 'Humano Assumiu'}</span>
      </div>

      {/* Botão toggle */}
      <button
        onClick={toggleAgente}
        disabled={carregando}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all border"
        style={{
          borderColor: 'var(--cor-borda)',
          color: 'var(--cor-texto-suave)',
          background: 'var(--cor-card)',
        }}
        title={ativo ? 'Pausar IA e assumir atendimento' : 'Reativar IA'}
      >
        {carregando ? (
          <Loader2 size={12} className="animate-spin" />
        ) : ativo ? (
          <User size={12} />
        ) : (
          <Bot size={12} />
        )}
        {ativo ? 'Assumir' : 'Reativar IA'}
      </button>
    </div>
  )
}
