'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Users, Target, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Resultado {
  tipo: 'contato' | 'lead'
  id: string
  titulo: string
  subtitulo: string
  href: string
}

export function BuscaGlobal() {
  const [aberta, setAberta] = useState(false)
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [carregando, setCarregando] = useState(false)
  const [selecionado, setSelecionado] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // cmd+K / ctrl+K abre a busca
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setAberta(true)
      }
      if (e.key === 'Escape') setAberta(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (aberta) { setTimeout(() => inputRef.current?.focus(), 50) } else { setQuery(''); setResultados([]); setSelecionado(0) } }, [aberta])

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); return }
    setCarregando(true)
    try {
      const res = await fetch(`/api/busca?q=${encodeURIComponent(q)}`)
      const data = await res.json() as { resultados: Resultado[] }
      setResultados(data.resultados ?? [])
      setSelecionado(0)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => buscar(query), 300)
    return () => clearTimeout(timer)
  }, [query, buscar])

  function navegar(href: string) {
    router.push(href)
    setAberta(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelecionado(s => Math.min(s + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelecionado(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && resultados[selecionado]) {
      navegar(resultados[selecionado].href)
    }
  }

  if (!aberta) {
    return (
      <button
        onClick={() => setAberta(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-opacity hover:opacity-80"
        style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto-suave)', background: 'var(--cor-fundo)' }}
      >
        <Search size={13} />
        <span>Buscar...</span>
        <kbd className="text-xs px-1 rounded" style={{ background: 'var(--cor-borda)' }}>⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={() => setAberta(false)}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--cor-borda)' }}>
          {carregando ? (
            <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: 'var(--cor-primaria)' }} />
          ) : (
            <Search size={16} className="flex-shrink-0" style={{ color: 'var(--cor-texto-suave)' }} />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar contatos, leads..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--cor-texto)' }}
          />
          <button onClick={() => setAberta(false)} style={{ color: 'var(--cor-texto-suave)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Resultados */}
        {resultados.length > 0 && (
          <div className="max-h-72 overflow-y-auto py-2">
            {resultados.map((r, i) => (
              <button
                key={r.id}
                onClick={() => navegar(r.href)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: i === selecionado ? 'var(--cor-fundo)' : 'transparent',
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--cor-fundo)' }}
                >
                  {r.tipo === 'contato'
                    ? <Users size={13} style={{ color: 'var(--cor-primaria)' }} />
                    : <Target size={13} style={{ color: 'var(--cor-destaque)' }} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--cor-texto)' }}>{r.titulo}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--cor-texto-suave)' }}>{r.subtitulo}</p>
                </div>
                <span
                  className="ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)' }}
                >
                  {r.tipo === 'contato' ? 'Contato' : 'Lead'}
                </span>
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && !carregando && resultados.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
              Nenhum resultado para &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t flex items-center gap-4 text-xs" style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto-suave)' }}>
          <span><kbd className="px-1 rounded border" style={{ borderColor: 'var(--cor-borda)' }}>↑↓</kbd> navegar</span>
          <span><kbd className="px-1 rounded border" style={{ borderColor: 'var(--cor-borda)' }}>↵</kbd> abrir</span>
          <span><kbd className="px-1 rounded border" style={{ borderColor: 'var(--cor-borda)' }}>Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}
