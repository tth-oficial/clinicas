'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { iniciais } from '@/lib/utils'
import type { Clinica } from '@/types'

const TITULOS: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/crm':          'CRM',
  '/whatsapp':     'WhatsApp',
  '/agendamento':  'Agendamento',
  '/anti-no-show': 'Anti No-Show',
  '/leads':        'Leads',
  '/follow-up':    'Follow-up',
  '/nutricao':     'Nutrição',
  '/reaquecimento':'Reaquecimento',
  '/ia-decisao':   'IA Decisão',
  '/relatorio':    'Relatório',
  '/configuracoes':'Configurações',
}

interface HeaderProps {
  clinica: Clinica
  userName?: string
}

export function Header({ clinica, userName }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)

  const tituloPagina = TITULOS[pathname] || TITULOS[Object.keys(TITULOS).find(k => pathname.startsWith(k)) || ''] || 'Opus Clínicas'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const nomeExibicao = userName || 'Usuário'

  return (
    <header
      className="h-14 flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: 'var(--cor-card)', borderBottom: '1px solid var(--cor-borda)' }}
    >
      <h1 className="text-base font-semibold" style={{ color: 'var(--cor-texto)' }}>
        {tituloPagina}
      </h1>

      <div className="flex items-center gap-3">
        <span className="text-sm hidden sm:block" style={{ color: 'var(--cor-texto-suave)' }}>
          {clinica.nome}
        </span>

        <div className="relative">
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
            style={{ background: 'transparent' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'var(--cor-primaria)' }}
            >
              {iniciais(nomeExibicao)}
            </div>
            <ChevronDown size={14} style={{ color: 'var(--cor-texto-suave)' }} />
          </button>

          {menuAberto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg py-1 z-20"
                style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--cor-borda)' }}>
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--cor-texto)' }}>{nomeExibicao}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors hover:opacity-80"
                  style={{ color: '#EF4444' }}
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
