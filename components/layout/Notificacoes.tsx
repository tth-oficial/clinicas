'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Target, MessageSquare, AlertTriangle, BarChart2 } from 'lucide-react'
import Link from 'next/link'

interface Notificacao {
  id: string
  tipo: 'lead' | 'mensagem' | 'alerta' | 'relatorio'
  titulo: string
  descricao: string
  href: string
}

const ICONES = {
  lead:      { Icon: Target,        cor: 'var(--cor-primaria)' },
  mensagem:  { Icon: MessageSquare, cor: '#3B82F6' },
  alerta:    { Icon: AlertTriangle, cor: '#F59E0B' },
  relatorio: { Icon: BarChart2,     cor: 'var(--cor-destaque)' },
}

export function Notificacoes() {
  const [aberto, setAberto] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [carregando, setCarregando] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const buscar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/notificacoes')
      const data = await res.json() as { notificacoes: Notificacao[] }
      setNotificacoes(data.notificacoes ?? [])
    } finally {
      setCarregando(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void buscar(); const i = setInterval(() => void buscar(), 60_000); return () => clearInterval(i) }, [buscar])

  // Fechar ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    if (aberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [aberto])

  const count = notificacoes.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-80"
        style={{ background: 'var(--cor-fundo)' }}
      >
        <Bell size={16} style={{ color: 'var(--cor-texto-suave)' }} />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: '#EF4444' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {aberto && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-xl overflow-hidden z-30"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--cor-borda)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--cor-texto)' }}>
              Notificações
              {count > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)' }}>
                  {count}
                </span>
              )}
            </p>
          </div>

          {carregando && notificacoes.length === 0 && (
            <div className="py-8 text-center text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
              Carregando...
            </div>
          )}

          {!carregando && notificacoes.length === 0 && (
            <div className="py-8 text-center">
              <Bell size={24} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--cor-texto-suave)' }} />
              <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>Tudo em dia!</p>
            </div>
          )}

          {notificacoes.map(n => {
            const { Icon, cor } = ICONES[n.tipo] ?? ICONES.alerta
            return (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => setAberto(false)}
                className="flex items-start gap-3 px-4 py-3 border-b transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--cor-borda)' }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--cor-fundo)' }}>
                  <Icon size={13} style={{ color: cor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>{n.titulo}</p>
                  <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{n.descricao}</p>
                </div>
              </Link>
            )
          })}

          <div className="px-4 py-2">
            <button onClick={buscar} className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
              Atualizar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
