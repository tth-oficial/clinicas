'use client'

import { useState, useRef, useEffect } from 'react'
import { Brain, Send, Loader2, User, Sparkles } from 'lucide-react'

interface Mensagem {
  id: string
  tipo: 'usuario' | 'ia'
  texto: string
  criado_em: Date
}

const PERGUNTAS_SUGERIDAS = [
  'Qual serviço está gerando mais receita este mês?',
  'Por que minha taxa de no-show está alta?',
  'Quantos leads estão em negociação agora?',
  'Como está minha taxa de conversão comparada ao mês passado?',
  'Quais ações posso tomar para aumentar a receita esta semana?',
]

function renderMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '&bull; $1')
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, '<br />')
}

function BolhaIA({ mensagem }: { mensagem: Mensagem }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--cor-destaque)' }}
      >
        <Brain size={16} color="#fff" />
      </div>
      <div
        className="flex-1 px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed max-w-[85%]"
        style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
        dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(mensagem.texto)}</p>` }}
      />
    </div>
  )
}

function BolhaUsuario({ mensagem }: { mensagem: Mensagem }) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <div
        className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed max-w-[80%]"
        style={{ background: 'var(--cor-destaque)', color: '#fff' }}
      >
        {mensagem.texto}
      </div>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)' }}
      >
        <User size={15} style={{ color: 'var(--cor-texto-suave)' }} />
      </div>
    </div>
  )
}

function LoadingIA() {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--cor-destaque)' }}
      >
        <Brain size={16} color="#fff" />
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
      >
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--cor-destaque)' }} />
          <span className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>
            Analisando dados da clínica...
          </span>
        </div>
      </div>
    </div>
  )
}

export function ChatDecisao() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [pergunta, setPergunta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  const enviar = async (texto: string) => {
    const textoFinal = texto.trim()
    if (!textoFinal || carregando) return

    setPergunta('')
    setMensagens(prev => [...prev, {
      id: crypto.randomUUID(),
      tipo: 'usuario',
      texto: textoFinal,
      criado_em: new Date(),
    }])
    setCarregando(true)

    try {
      const res = await fetch('/api/ia-decisao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: textoFinal }),
      })
      const json = await res.json() as { resposta?: string; error?: string }

      setMensagens(prev => [...prev, {
        id: crypto.randomUUID(),
        tipo: 'ia',
        texto: json.resposta ?? json.error ?? 'Erro ao processar resposta.',
        criado_em: new Date(),
      }])
    } catch {
      setMensagens(prev => [...prev, {
        id: crypto.randomUUID(),
        tipo: 'ia',
        texto: 'Erro de conexão. Tente novamente.',
        criado_em: new Date(),
      }])
    } finally {
      setCarregando(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void enviar(pergunta)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Área de chat */}
      <div
        className="flex-1 overflow-y-auto p-4 rounded-2xl space-y-4 mb-4"
        style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)' }}
      >
        {mensagens.length === 0 && !carregando ? (
          /* Estado vazio — sugestões */
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--cor-destaque)' }}
            >
              <Sparkles size={30} color="#fff" />
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--cor-texto)' }}>
              IA de Decisão
            </h3>
            <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--cor-texto-suave)' }}>
              Faça perguntas estratégicas sobre a sua clínica. Analiso dados reais para responder.
            </p>

            <div className="grid gap-2 w-full max-w-md">
              {PERGUNTAS_SUGERIDAS.map(s => (
                <button
                  key={s}
                  onClick={() => void enviar(s)}
                  className="px-4 py-2.5 rounded-xl text-sm text-left transition-all hover:opacity-90"
                  style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {mensagens.map(m => (
              m.tipo === 'usuario'
                ? <BolhaUsuario key={m.id} mensagem={m} />
                : <BolhaIA key={m.id} mensagem={m} />
            ))}
            {carregando && <LoadingIA />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          ref={inputRef}
          value={pergunta}
          onChange={e => setPergunta(e.target.value)}
          placeholder="Faça uma pergunta sobre sua clínica..."
          disabled={carregando}
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-colors disabled:opacity-60"
          style={{
            background: 'var(--cor-card)',
            border: '1px solid var(--cor-borda)',
            color: 'var(--cor-texto)',
          }}
        />
        <button
          type="submit"
          disabled={!pergunta.trim() || carregando}
          className="px-5 py-3 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
          style={{ background: 'var(--cor-destaque)', color: '#fff' }}
        >
          {carregando
            ? <Loader2 size={16} className="animate-spin" />
            : <Send size={16} />}
          Perguntar
        </button>
      </form>
    </div>
  )
}
