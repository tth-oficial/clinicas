'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Smartphone,
  CheckCircle,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface QRCodeSetupProps {
  clinicaId: string
  onConectado?: () => void
}

type SetupStatus =
  | 'idle'
  | 'iniciando'
  | 'aguardando_scan'
  | 'conectado'
  | 'erro'

export function QRCodeSetup({ clinicaId, onConectado }: QRCodeSetupProps) {
  const [status, setStatus] = useState<SetupStatus>('idle')
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [erroMsg, setErroMsg] = useState<string | null>(null)
  const [pollingAtivo, setPollingAtivo] = useState(false)

  // Polling de status a cada 3 segundos enquanto aguarda scan
  const verificarStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/whatsapp/setup?clinicaId=${clinicaId}`
      )
      const data = await res.json() as { status: string; instanceName?: string }

      if (data.status === 'open') {
        setStatus('conectado')
        setPollingAtivo(false)
        toast.success('WhatsApp conectado com sucesso! 🎉')
        onConectado?.()
      }
    } catch {
      // Silencioso — não interrompe o polling
    }
  }, [clinicaId, onConectado])

  useEffect(() => {
    if (!pollingAtivo) return

    const intervalo = setInterval(verificarStatus, 3000)
    return () => clearInterval(intervalo)
  }, [pollingAtivo, verificarStatus])

  async function iniciarSetup() {
    setStatus('iniciando')
    setErroMsg(null)
    setQrcode(null)

    try {
      const res = await fetch('/api/whatsapp/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicaId }),
      })

      const data = await res.json() as {
        ok?: boolean
        status?: string
        qrcode?: string | null
        instanceName?: string
        mensagem?: string
        error?: string
      }

      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'Erro desconhecido')
      }

      setInstanceName(data.instanceName ?? null)

      if (data.status === 'open') {
        setStatus('conectado')
        toast.success('WhatsApp já está conectado!')
        onConectado?.()
        return
      }

      if (data.qrcode) {
        setQrcode(data.qrcode)
        setStatus('aguardando_scan')
        setPollingAtivo(true)
      } else {
        throw new Error('QR Code não retornado pela Evolution API')
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao iniciar configuração'
      setErroMsg(msg)
      setStatus('erro')
      toast.error(msg)
    }
  }

  async function regenarQR() {
    setPollingAtivo(false)
    await iniciarSetup()
  }

  // ─── Renderização por estado ────────────────────────────────────────────────

  if (status === 'conectado') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(34, 197, 94, 0.12)' }}
        >
          <CheckCircle size={32} color="#16a34a" />
        </div>
        <div className="text-center">
          <p className="font-semibold" style={{ color: 'var(--cor-texto)' }}>
            WhatsApp Conectado!
          </p>
          {instanceName && (
            <p className="text-xs mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
              Instância: <code className="font-mono">{instanceName}</code>
            </p>
          )}
          <p className="text-sm mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
            O agente Luna já pode receber e responder mensagens.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'aguardando_scan' && qrcode) {
    return (
      <div className="flex flex-col items-center gap-5">
        {/* Instrução */}
        <div className="flex items-start gap-3 w-full max-w-sm p-4 rounded-xl"
          style={{ background: 'rgba(45,139,115,0.08)', border: '1px solid var(--cor-borda)' }}
        >
          <Smartphone size={18} style={{ color: 'var(--cor-destaque)', marginTop: 2 }} className="shrink-0" />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>
              Como conectar:
            </p>
            <ol className="text-xs mt-1 space-y-0.5 list-decimal list-inside" style={{ color: 'var(--cor-texto-suave)' }}>
              <li>Abra o WhatsApp no celular</li>
              <li>Toque em <strong>Dispositivos conectados</strong></li>
              <li>Toque em <strong>Conectar dispositivo</strong></li>
              <li>Aponte a câmera para o QR abaixo</li>
            </ol>
          </div>
        </div>

        {/* QR Code */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: '#fff', border: '1px solid var(--cor-borda)' }}
        >
          <Image
            src={qrcode}
            alt="QR Code WhatsApp"
            width={240}
            height={240}
            unoptimized
          />
        </div>

        {/* Status aguardando */}
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
          <Loader2 size={14} className="animate-spin" />
          Aguardando leitura do QR...
        </div>

        {/* Botão regenerar */}
        <button
          onClick={regenarQR}
          className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border transition-all"
          style={{
            color: 'var(--cor-texto-suave)',
            borderColor: 'var(--cor-borda)',
          }}
        >
          <RefreshCw size={12} />
          QR expirou? Gerar novo
        </button>
      </div>
    )
  }

  if (status === 'erro') {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239, 68, 68, 0.1)' }}
        >
          <AlertCircle size={28} color="#ef4444" />
        </div>
        <div className="text-center">
          <p className="font-medium" style={{ color: 'var(--cor-texto)' }}>
            Falha na configuração
          </p>
          <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--cor-texto-suave)' }}>
            {erroMsg}
          </p>
        </div>
        <button
          onClick={iniciarSetup}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background: 'var(--cor-destaque)' }}
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      </div>
    )
  }

  // Estado inicial / iniciando
  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(45,139,115,0.1)' }}
      >
        {status === 'iniciando' ? (
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--cor-destaque)' }} />
        ) : (
          <WifiOff size={28} style={{ color: 'var(--cor-texto-suave)', opacity: 0.5 }} />
        )}
      </div>

      <div className="text-center">
        <p className="font-semibold" style={{ color: 'var(--cor-texto)' }}>
          {status === 'iniciando'
            ? 'Configurando instância...'
            : 'WhatsApp não conectado'}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
          {status === 'iniciando'
            ? 'Aguarde, estamos preparando tudo automaticamente.'
            : 'Conecte o WhatsApp da clínica para ativar o agente Luna.'}
        </p>
      </div>

      {status !== 'iniciando' && (
        <button
          onClick={iniciarSetup}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'var(--cor-destaque)' }}
        >
          <Wifi size={16} />
          Conectar WhatsApp
        </button>
      )}
    </div>
  )
}
