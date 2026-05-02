import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

// Fonte base — cada clínica pode ter a própria fonte carregada via ThemeProvider
const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-base',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Opus Clínicas',
  description: 'Sistema operacional para clínicas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={jakartaSans.variable}>
      <body className="antialiased" style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto)' }}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
