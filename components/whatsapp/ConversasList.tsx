'use client'

import { Bot, User, MessageSquare } from 'lucide-react'
import { useConversas, type ConversaItem } from '@/hooks/useConversas'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ConversasListProps {
  clinicaId: string
  conversaSelecionadaId?: string
  onSelecionarConversa: (conversa: ConversaItem) => void
  conversasIniciais?: ConversaItem[]
}

function formatarTimestamp(iso: string): string {
  try {
    const data = new Date(iso)
    if (isToday(data)) return format(data, 'HH:mm')
    if (isYesterday(data)) return 'Ontem'
    return format(data, 'dd/MM', { locale: ptBR })
  } catch {
    return ''
  }
}

function truncarTexto(texto: string | null | undefined, max = 40): string {
  if (!texto) return ''
  return texto.length > max ? texto.slice(0, max) + '…' : texto
}

export function ConversasList({
  clinicaId,
  conversaSelecionadaId,
  onSelecionarConversa,
  conversasIniciais,
}: ConversasListProps) {
  const { conversas, carregando } = useConversas(clinicaId)

  // Usar dados do Realtime se disponíveis, senão os iniciais do server
  const lista = conversas.length > 0 ? conversas : (conversasIniciais ?? [])

  if (carregando && lista.length === 0) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl animate-pulse"
            style={{ background: 'var(--cor-fundo)' }}
          />
        ))}
      </div>
    )
  }

  if (lista.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <MessageSquare
          size={36}
          style={{ color: 'var(--cor-texto-suave)', opacity: 0.3 }}
        />
        <p
          className="text-sm text-center"
          style={{ color: 'var(--cor-texto-suave)' }}
        >
          Nenhuma conversa ainda.
          <br />
          Configure o webhook para receber mensagens.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {lista.map((conversa) => {
        const ativa = conversa.id === conversaSelecionadaId
        const contato = conversa.contatos
        const ultimaMsg = conversa.ultima_mensagem

        return (
          <button
            key={conversa.id}
            onClick={() => onSelecionarConversa(conversa)}
            className="flex items-start gap-3 px-4 py-3 text-left w-full transition-all border-b"
            style={{
              background: ativa ? 'rgba(var(--cor-destaque-rgb, 45,139,115), 0.08)' : 'transparent',
              borderColor: 'var(--cor-borda)',
              borderLeft: ativa ? '3px solid var(--cor-destaque)' : '3px solid transparent',
            }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5"
              style={{ background: ativa ? 'var(--cor-destaque)' : 'var(--cor-primaria)' }}
            >
              {contato?.nome?.charAt(0)?.toUpperCase() ?? '?'}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span
                  className="font-semibold text-sm truncate"
                  style={{ color: 'var(--cor-texto)' }}
                >
                  {contato?.nome ?? `+${contato?.telefone ?? '?'}`}
                </span>
                {ultimaMsg && (
                  <span
                    className="text-[10px] shrink-0"
                    style={{ color: 'var(--cor-texto-suave)' }}
                  >
                    {formatarTimestamp(ultimaMsg.enviado_em)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-1 mt-0.5">
                <p
                  className="text-xs truncate flex-1"
                  style={{ color: 'var(--cor-texto-suave)' }}
                >
                  {ultimaMsg
                    ? truncarTexto(ultimaMsg.texto)
                    : 'Sem mensagens'}
                </p>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Badge não lidas */}
                  {conversa.nao_lidas > 0 && (
                    <span
                      className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                      style={{ background: 'var(--cor-destaque)' }}
                    >
                      {conversa.nao_lidas > 9 ? '9+' : conversa.nao_lidas}
                    </span>
                  )}

                  {/* Badge agente */}
                  {conversa.agente_ativo ? (
                    <Bot
                      size={12}
                      aria-label="IA Ativa"
                      style={{ color: '#16a34a' }}
                    />
                  ) : (
                    <User
                      size={12}
                      aria-label="Humano"
                      style={{ color: '#ea580c' }}
                    />
                  )}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
