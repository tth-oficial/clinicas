'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, Loader2, Phone } from 'lucide-react'

interface StatusWA {
  status: 'open' | 'connecting' | 'close'
  qrcode?: string | null
  numero?: string | null
}

interface Props {
  clinicaId: string
}

export function AbaWhatsApp({ clinicaId }: Props) {
  const [dados, setDados] = useState<StatusWA | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [conectando, setConectando] = useState(false)
  const [desconectando, setDesconectando] = useState(false)
  const [countdown, setCountdown] = useState(30)

  const buscarStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/instance?clinicaId=${clinicaId}`)
      const data = await res.json() as { status?: StatusWA }
      setDados(data.status ?? null)
    } finally {
      setCarregando(false)
    }
  }, [clinicaId])

  useEffect(() => {
    buscarStatus()
  }, [buscarStatus])

  // Polling quando aguardando conexão
  useEffect(() => {
    if (dados?.status !== 'connecting') return

    const interval = setInterval(async () => {
      setCountdown(c => {
        if (c <= 1) { buscarStatus(); return 30 }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [dados?.status, buscarStatus])

  async function handleConectar() {
    setConectando(true)
    try {
      const res = await fetch(`/api/whatsapp/instance?clinicaId=${clinicaId}`, { method: 'POST' })
      const data = await res.json() as StatusWA
      setDados(data)
      setCountdown(30)
    } finally {
      setConectando(false)
    }
  }

  async function handleDesconectar() {
    setDesconectando(true)
    try {
      await fetch(`/api/whatsapp/instance?clinicaId=${clinicaId}`, { method: 'DELETE' })
      setDados({ status: 'close' })
    } finally {
      setDesconectando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-8" style={{ color: 'var(--cor-texto-suave)' }}>
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Verificando status...</span>
      </div>
    )
  }

  const status = dados?.status ?? 'close'

  return (
    <div className="max-w-md">
      <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-card)' }}>
        {/* Status indicator */}
        <div className="flex items-center gap-3">
          {status === 'open' ? (
            <Wifi size={20} style={{ color: '#22C55E' }} />
          ) : (
            <WifiOff size={20} style={{ color: '#EF4444' }} />
          )}
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--cor-texto)' }}>
              Status:{' '}
              <span style={{ color: status === 'open' ? '#22C55E' : status === 'connecting' ? '#F59E0B' : '#EF4444' }}>
                {status === 'open' ? 'Conectado' : status === 'connecting' ? 'Conectando...' : 'Desconectado'}
              </span>
            </p>
            {dados?.numero && (
              <div className="flex items-center gap-1 mt-0.5">
                <Phone size={12} style={{ color: 'var(--cor-texto-suave)' }} />
                <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{dados.numero}</p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code */}
        {status === 'connecting' && dados?.qrcode && (
          <div className="text-center space-y-3">
            <p className="text-sm" style={{ color: 'var(--cor-texto)' }}>
              Escaneie o QR Code com o WhatsApp da clínica
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dados.qrcode}
              alt="QR Code WhatsApp"
              className="w-48 h-48 mx-auto rounded-xl border"
              style={{ borderColor: 'var(--cor-borda)' }}
            />
            <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
              Atualizando em {countdown}s...
            </p>
            <button
              onClick={buscarStatus}
              className="flex items-center gap-2 mx-auto text-sm px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)' }}
            >
              <RefreshCw size={13} /> Verificar agora
            </button>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          {status === 'open' ? (
            <button
              onClick={handleDesconectar}
              disabled={desconectando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ borderColor: '#EF4444', color: '#EF4444' }}
            >
              {desconectando && <Loader2 size={13} className="animate-spin" />}
              Desconectar
            </button>
          ) : (
            <button
              onClick={handleConectar}
              disabled={conectando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--cor-primaria)' }}
            >
              {conectando && <Loader2 size={13} className="animate-spin" />}
              {conectando ? 'Gerando QR Code...' : 'Conectar WhatsApp'}
            </button>
          )}

          <button
            onClick={buscarStatus}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)' }}
          >
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>
      </div>

      <p className="text-xs mt-3" style={{ color: 'var(--cor-texto-suave)' }}>
        Use o número de WhatsApp da clínica para escanear. Após conectar, o agente IA começa a responder automaticamente.
      </p>
    </div>
  )
}
