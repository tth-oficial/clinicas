'use client'

import { useEffect } from 'react'
import { temaParaCss, type Tema } from '@/lib/theme'

interface ThemeProviderProps {
  tema: Tema
  children: React.ReactNode
}

export function ThemeProvider({ tema, children }: ThemeProviderProps) {
  useEffect(() => {
    const styleEl = document.getElementById('opus-theme') || document.createElement('style')
    styleEl.id = 'opus-theme'
    styleEl.textContent = `:root { ${temaParaCss(tema)} }`
    if (!document.getElementById('opus-theme')) {
      document.head.appendChild(styleEl)
    }

    const linkId = 'opus-font'
    const existingLink = document.getElementById(linkId) as HTMLLinkElement | null
    if (existingLink) {
      existingLink.href = `https://fonts.googleapis.com/css2?family=${tema.fonte.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
    } else {
      const link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${tema.fonte.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
      document.head.appendChild(link)
    }

    if (tema.faviconUrl) {
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (favicon) favicon.href = tema.faviconUrl
    }
  }, [tema])

  return <>{children}</>
}
