'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, MessageSquare, Calendar,
  BellRing, Target, RefreshCw, Leaf, Flame, Brain, BarChart2,
  Settings, Menu, X,
} from 'lucide-react'
import type { Tema } from '@/lib/theme'
import type { Clinica } from '@/types'

const MENU_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',     Icon: LayoutDashboard },
  { href: '/crm',           label: 'CRM',           Icon: Users },
  { href: '/whatsapp',      label: 'WhatsApp',      Icon: MessageSquare },
  { href: '/agendamento',   label: 'Agendamento',   Icon: Calendar },
  { href: '/anti-no-show',  label: 'Anti No-Show',  Icon: BellRing },
  { href: '/leads',         label: 'Leads',         Icon: Target },
  { href: '/follow-up',     label: 'Follow-up',     Icon: RefreshCw },
  { href: '/nutricao',      label: 'Nutrição',      Icon: Leaf },
  { href: '/reaquecimento', label: 'Reaquecimento', Icon: Flame },
  { href: '/ia-decisao',    label: 'IA Decisão',    Icon: Brain },
  { href: '/relatorio',     label: 'Relatório',     Icon: BarChart2 },
]

interface SidebarProps {
  clinica: Clinica
  tema: Tema
}

function SidebarLogo({ tema }: { tema: Tema }) {
  return (
    <div className="px-5 py-6 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      {tema.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tema.logoUrl} alt={tema.nomeExibicao} className="h-8 w-auto object-contain" />
      ) : (
        <div className="flex flex-col">
          <span className="text-base font-bold leading-tight" style={{ color: 'var(--cor-sidebar-texto)' }}>
            {tema.nomeExibicao}
          </span>
          {tema.slogan && (
            <span className="text-xs mt-0.5" style={{ color: 'var(--cor-sidebar-texto)', opacity: 0.55 }}>
              {tema.slogan}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SidebarLogoMobile({ tema, onClose }: { tema: Tema; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      {tema.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tema.logoUrl} alt={tema.nomeExibicao} className="h-7 w-auto object-contain" />
      ) : (
        <span className="text-sm font-bold" style={{ color: 'var(--cor-sidebar-texto)' }}>
          {tema.nomeExibicao}
        </span>
      )}
      <button onClick={onClose}>
        <X size={18} style={{ color: 'var(--cor-sidebar-texto)', opacity: 0.7 }} />
      </button>
    </div>
  )
}

function SidebarFooter({ clinica }: { clinica: Clinica }) {
  return (
    <div className="px-5 py-4 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <p className="text-xs" style={{ color: 'var(--cor-sidebar-texto)', opacity: 0.35 }}>
        {clinica.cidade || 'Opus Clínicas'}
      </p>
    </div>
  )
}

function NavLinks({ pathname, onClick }: { pathname: string; onClick?: () => void }) {
  return (
    <>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {MENU_ITEMS.map(({ href, label, Icon }) => {
          const ativo = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClick}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-2"
              style={{
                color: 'var(--cor-sidebar-texto)',
                opacity: ativo ? 1 : 0.6,
                background: ativo ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderColor: ativo ? 'var(--cor-destaque)' : 'transparent',
              }}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Configurações */}
      <div className="px-3 pb-3">
        <Link
          href="/configuracoes"
          onClick={onClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-2"
          style={{
            color: 'var(--cor-sidebar-texto)',
            opacity: pathname === '/configuracoes' ? 1 : 0.6,
            background: pathname === '/configuracoes' ? 'rgba(255,255,255,0.1)' : 'transparent',
            borderColor: pathname === '/configuracoes' ? 'var(--cor-destaque)' : 'transparent',
          }}
        >
          <Settings size={17} />
          Configurações
        </Link>
      </div>
    </>
  )
}

export function Sidebar({ clinica, tema }: SidebarProps) {
  const pathname = usePathname()
  const [drawerAberto, setDrawerAberto] = useState(false)

  // Impedir scroll do body quando drawer aberto
  useEffect(() => {
    document.body.style.overflow = drawerAberto ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerAberto])

  return (
    <>
      {/* Botão hamburguer — visível apenas em mobile */}
      <button
        onClick={() => setDrawerAberto(true)}
        className="md:hidden fixed top-3.5 left-4 z-40 w-8 h-8 flex items-center justify-center rounded-lg"
        style={{ background: 'var(--cor-sidebar)' }}
        aria-label="Abrir menu"
      >
        <Menu size={18} style={{ color: 'var(--cor-sidebar-texto)' }} />
      </button>

      {/* Sidebar desktop — oculta em mobile */}
      <aside
        className="hidden md:flex w-60 flex-shrink-0 flex-col h-full overflow-hidden"
        style={{ background: 'var(--cor-sidebar)' }}
      >
        <SidebarLogo tema={tema} />
        <NavLinks pathname={pathname} />
        <SidebarFooter clinica={clinica} />
      </aside>

      {/* Drawer mobile */}
      {drawerAberto && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setDrawerAberto(false)}
          />

          {/* Drawer */}
          <aside
            className="fixed top-0 left-0 h-full w-64 z-50 flex flex-col md:hidden overflow-hidden"
            style={{ background: 'var(--cor-sidebar)' }}
          >
            <SidebarLogoMobile tema={tema} onClose={() => setDrawerAberto(false)} />
            <NavLinks pathname={pathname} onClick={() => setDrawerAberto(false)} />
            <SidebarFooter clinica={clinica} />
          </aside>
        </>
      )}
    </>
  )
}
