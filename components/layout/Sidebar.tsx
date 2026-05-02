'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, MessageSquare, Calendar,
  BellRing, Target, RefreshCw, Leaf, Flame, Brain, BarChart2,
} from 'lucide-react'
import type { Tema } from '@/lib/theme'
import type { Clinica } from '@/types'

const MENU_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/crm',         label: 'CRM',          Icon: Users },
  { href: '/whatsapp',    label: 'WhatsApp',     Icon: MessageSquare },
  { href: '/agendamento', label: 'Agendamento',  Icon: Calendar },
  { href: '/anti-no-show',label: 'Anti No-Show', Icon: BellRing },
  { href: '/leads',       label: 'Leads',        Icon: Target },
  { href: '/follow-up',   label: 'Follow-up',    Icon: RefreshCw },
  { href: '/nutricao',    label: 'Nutrição',     Icon: Leaf },
  { href: '/reaquecimento',label: 'Reaquecimento',Icon: Flame },
  { href: '/ia-decisao',  label: 'IA Decisão',   Icon: Brain },
  { href: '/relatorio',   label: 'Relatório',    Icon: BarChart2 },
]

interface SidebarProps {
  clinica: Clinica
  tema: Tema
}

export function Sidebar({ clinica, tema }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-full overflow-y-auto"
      style={{ background: 'var(--cor-sidebar)' }}
    >
      {/* Logo / nome da clínica */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {tema.logoUrl ? (
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

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {MENU_ITEMS.map(({ href, label, Icon }) => {
          const ativo = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
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

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <p className="text-xs" style={{ color: 'var(--cor-sidebar-texto)', opacity: 0.35 }}>
          {clinica.cidade || 'Opus Clínicas'}
        </p>
      </div>
    </aside>
  )
}
