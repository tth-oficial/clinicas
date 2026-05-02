'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { useMensagens } from '@/hooks/useMensagens'
import { AgenteStatus } from './AgenteStatus'
import type { ConversaItem } from '@/hooks/useConversas'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ChatWindowProps {
  conversa: ConversaItem
}

export function ChatWindow({ conversa }: ChatWindowProps) {
  const { mensagens, carregando, endRef } = useMensagens(conversa.id)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [agenteAtivo, setAgenteAtivo] = useState(conversa.agente_ativo)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focar input quando troca de conversa
  useEffect(() => {
    if (!agenteAtivo) {
      inputRef.current?.focus()
    }
  }, [conversa.id, agenteAtivo])

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || enviando) return

    setEnviando(true)
    const textoEnviar = texto.trim()
    setTexto('')

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversaId: conversa.id,
          texto: textoEnviar,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { aviso?: string; error?: string }
        if (data.aviso) {
          toast.warning(data.aviso)
        } else {
          throw new Error(data.error ?? 'Erro ao enviar')
        }
      }
    } catch (err) {
      console.error('[ChatWindow] Erro ao enviar', err)
      toast.error('Falha ao enviar mensagem')
      setTexto(textoEnviar) // Restaurar texto se falhou
    } finally {
      setEnviando(false)
    }
  }

  function formatarHora(iso: string) {
    try {
      return format(new Date(iso), 'HH:mm', { locale: ptBR })
    } catch {
      return ''
    }
  }

  const contato = conversa.contatos

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--cor-fundo)' }}>
      {/* Header da conversa */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{
          background: 'var(--cor-card)',
          borderColor: 'var(--cor-borda)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: 'var(--cor-primaria)' }}
          >
            {contato?.nome?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--cor-texto)' }}>
              {contato?.nome ?? 'Desconhecido'}
            </p>
            <p
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--cor-texto-suave)' }}
            >
              <Phone size={10} />
              {contato?.telefone ?? '—'}
            </p>
          </div>
        </div>

        <AgenteStatus
          conversaId={conversa.id}
          agenteAtivo={agenteAtivo}
          onToggle={setAgenteAtivo}
        />
      </div>

      {/* Lista de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {carregando && (
          <div className="flex justify-center py-8">
            <Loader2
              size={20}
              className="animate-spin"
              style={{ color: 'var(--cor-texto-suave)' }}
            />
          </div>
        )}

        {!carregando && mensagens.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Bot size={32} style={{ color: 'var(--cor-texto-suave)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
              Nenhuma mensagem ainda
            </p>
          </div>
        )}

        {mensagens.map((msg) => {
          if (msg.de === 'sistema') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span
                  className="text-xs px-3 py-1 rounded-full"
                  style={{
                    background: 'rgba(0,0,0,0.05)',
                    color: 'var(--cor-texto-suave)',
                  }}
                >
                  {msg.texto}
                </span>
              </div>
            )
          }

          const isAgente = msg.de === 'agente'

          return (
            <div
              key={msg.id}
              className={`flex ${isAgente ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] group`}
              >
                {/* Badge IA */}
                {isAgente && (
                  <div className="flex justify-end mb-0.5">
                    <span
                      className="text-[10px] font-medium flex items-center gap-1"
                      style={{ color: 'var(--cor-texto-suave)' }}
                    >
                      <Bot size={9} />
                      Luna IA
                    </span>
                  </div>
                )}

                <div
                  className="px-3.5 py-2 rounded-2xl text-sm leading-relaxed"
                  style={
                    isAgente
                      ? {
                          background: 'var(--cor-primaria)',
                          color: '#fff',
                          borderBottomRightRadius: 4,
                        }
                      : {
                          background: 'var(--cor-card)',
                          color: 'var(--cor-texto)',
                          border: '1px solid var(--cor-borda)',
                          borderBottomLeftRadius: 4,
                        }
                  }
                >
                  {msg.texto}
                </div>

                <div
                  className={`text-[10px] mt-0.5 ${isAgente ? 'text-right' : 'text-left'}`}
                  style={{ color: 'var(--cor-texto-suave)' }}
                >
                  {formatarHora(msg.enviado_em)}
                </div>
              </div>
            </div>
          )
        })}

        {/* Âncora de scroll automático */}
        <div ref={endRef} />
      </div>

      {/* Input de mensagem */}
      <div
        className="px-4 py-3 border-t shrink-0"
        style={{
          background: 'var(--cor-card)',
          borderColor: 'var(--cor-borda)',
        }}
      >
        {agenteAtivo ? (
          /* IA respondendo — input desabilitado */
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            style={{
              background: 'var(--cor-fundo)',
              color: 'var(--cor-texto-suave)',
              border: '1px solid var(--cor-borda)',
            }}
          >
            <Loader2 size={14} className="animate-spin shrink-0" />
            Luna está respondendo...
          </div>
        ) : (
          /* Humano assumiu — input ativo */
          <form onSubmit={enviarMensagem} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite uma mensagem..."
              disabled={enviando}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--cor-fundo)',
                color: 'var(--cor-texto)',
                border: '1px solid var(--cor-borda)',
              }}
            />
            <button
              type="submit"
              disabled={!texto.trim() || enviando}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0"
              style={{
                background: texto.trim()
                  ? 'var(--cor-destaque)'
                  : 'var(--cor-borda)',
                color: '#fff',
              }}
            >
              {enviando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
