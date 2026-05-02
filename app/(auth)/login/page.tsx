'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('Email ou senha incorretos.')
      setCarregando(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A0F0D' }}>
      <div className="w-full max-w-md">
        {/* Logo / marca */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'var(--cor-primaria)' }}>
            <span className="text-2xl font-bold text-white">O</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Opus Clínicas</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Sistema operacional para clínicas</p>
        </div>

        {/* Formulário */}
        <div className="rounded-2xl p-8" style={{ background: '#141918', border: '1px solid #1F2B27' }}>
          <h2 className="text-lg font-semibold text-white mb-6">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 transition"
                style={{
                  background: '#0A0F0D',
                  border: '1px solid #1F2B27',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition"
                style={{ background: '#0A0F0D', border: '1px solid #1F2B27' }}
              />
            </div>

            {erro && (
              <p className="text-sm text-red-400 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)' }}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'var(--cor-primaria)' }}
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs" style={{ color: '#4B5563' }}>
            Esqueceu a senha? Entre em contato com o administrador.
          </p>
        </div>
      </div>
    </div>
  )
}
