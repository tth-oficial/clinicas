'use client'

import { useState } from 'react'
import { ConversasList } from '@/components/whatsapp/ConversasList'
import { ChatWindow } from '@/components/whatsapp/ChatWindow'
import { QRCodeSetup } from '@/components/whatsapp/QRCodeSetup'
import type { ConversaItem } from '@/hooks/useConversas'
import { MessageSquare, Wifi } from 'lucide-react'

interface WhatsAppClientProps {
  clinicaId: string
  conversasIniciais: ConversaItem[]
  instanceStatus: 'open' | 'connecting' | 'close' | 'not_configured'
}

export function WhatsAppClient({
  clinicaId,
  conversasIniciais,
  instanceStatus: statusInicial,
}: WhatsAppClientProps) {
  const [conversaSelecionada, setConversaSelecionada] =
    useState<ConversaItem | null>(null)
  const [conectado, setConectado] = useState(statusInicial === 'open')

  // Se não está conectado, mostrar tela de setup em tela cheia
  if (!conectado) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full rounded-xl border"
        style={{
          background: 'var(--cor-card)',
          borderColor: 'var(--cor-borda)',
        }}
      >
        <div className="w-full max-w-md px-6">
          <div className="flex items-center gap-2 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--cor-primaria)' }}
            >
              <Wifi size={16} color="#fff" />
            </div>
            <div>
              <h1
                className="font-bold text-base"
                style={{ color: 'var(--cor-texto)' }}
              >
                Configurar WhatsApp
              </h1>
              <p
                className="text-xs"
                style={{ color: 'var(--cor-texto-suave)' }}
              >
                Conecte o número da clínica para ativar o agente Luna
              </p>
            </div>
          </div>

          <QRCodeSetup
            clinicaId={clinicaId}
            onConectado={() => setConectado(true)}
          />
        </div>
      </div>
    )
  }

  // Interface normal de conversas
  return (
    <div className="flex h-full overflow-hidden rounded-xl border" style={{ borderColor: 'var(--cor-borda)' }}>
      {/* Coluna esquerda — lista de conversas */}
      <div
        className="w-[300px] shrink-0 flex flex-col border-r overflow-hidden"
        style={{
          background: 'var(--cor-card)',
          borderColor: 'var(--cor-borda)',
        }}
      >
        {/* Header da lista */}
        <div
          className="px-4 py-3 border-b shrink-0 flex items-center justify-between"
          style={{ borderColor: 'var(--cor-borda)' }}
        >
          <h2
            className="font-semibold text-sm flex items-center gap-2"
            style={{ color: 'var(--cor-texto)' }}
          >
            <MessageSquare size={15} />
            Conversas
          </h2>
          {/* Indicador de conexão */}
          <span
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Online
          </span>
        </div>

        {/* Lista scrollável */}
        <div className="flex-1 overflow-y-auto">
          <ConversasList
            clinicaId={clinicaId}
            conversaSelecionadaId={conversaSelecionada?.id}
            onSelecionarConversa={setConversaSelecionada}
            conversasIniciais={conversasIniciais}
          />
        </div>
      </div>

      {/* Coluna direita — chat ativo */}
      <div className="flex-1 overflow-hidden">
        {conversaSelecionada ? (
          <ChatWindow key={conversaSelecionada.id} conversa={conversaSelecionada} />
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full gap-3"
            style={{ background: 'var(--cor-fundo)' }}
          >
            <MessageSquare
              size={40}
              style={{ color: 'var(--cor-texto-suave)', opacity: 0.25 }}
            />
            <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
              Selecione uma conversa para começar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
