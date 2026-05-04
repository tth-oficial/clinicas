'use client'

import { useState } from 'react'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'

interface Template {
  id: string
  titulo: string
  descricao: string
  mensagens: { etapa: number; label: string; template: string }[]
}

const TEMPLATES_PADRAO: Template[] = [
  {
    id: 'anti_noshow',
    titulo: 'Anti No-Show',
    descricao: 'Enviado automaticamente antes de cada consulta',
    mensagens: [
      {
        etapa: 1,
        label: '48h antes',
        template: 'Oi {nome}! Confirmando sua consulta de {servico} na {clinica} para {data} às {hora}. Você confirma presença? Responda SIM ou NÃO.',
      },
      {
        etapa: 2,
        label: '24h antes',
        template: 'Lembrete, {nome}! Sua consulta é amanhã às {hora}. Confirmado? 😊',
      },
      {
        etapa: 3,
        label: '2h antes',
        template: 'Você tem consulta em 2 horas, {nome}! Te esperamos às {hora} 🌿',
      },
    ],
  },
  {
    id: 'followup',
    titulo: 'Follow-up',
    descricao: 'Enviado quando lead fica sem resposta por 2+ dias',
    mensagens: [
      {
        etapa: 1,
        label: 'Tentativa 1 — Direto',
        template: 'Oi {nome}, ainda posso te ajudar com {servico}?',
      },
      {
        etapa: 2,
        label: 'Tentativa 2 — Valor',
        template: '{nome}, {servico} pode transformar sua rotina. Posso tirar suas dúvidas?',
      },
      {
        etapa: 3,
        label: 'Tentativa 3 — Encerramento',
        template: '{nome}, esta será minha última mensagem por ora. Se quiser retomar, é só me chamar! 🌷',
      },
    ],
  },
  {
    id: 'nutricao',
    titulo: 'Nutrição de Leads',
    descricao: 'Sequência enviada para leads em negociação',
    mensagens: [
      {
        etapa: 1,
        label: 'Dia 1 — Educacional',
        template: 'Oi {nome}! Sabia que {servico} pode {beneficio}? É um procedimento seguro e eficaz 🌿',
      },
      {
        etapa: 2,
        label: 'Dia 3 — Prova social',
        template: '{nome}, temos ajudado muitos pacientes com {servico} a alcançar ótimos resultados. Quer saber mais?',
      },
      {
        etapa: 3,
        label: 'Dia 5 — Urgência',
        template: '{nome}, nossa agenda para {servico} está quase cheia esse mês. Que tal garantir sua vaga?',
      },
      {
        etapa: 4,
        label: 'Dia 7 — Facilitador',
        template: '{nome}, temos condições especiais para {servico} essa semana. Quer conhecer?',
      },
    ],
  },
]

interface Props {
  onSalvar: (dados: Record<string, string[]>) => Promise<void>
}

export function AbaAutomacoes({ onSalvar }: Props) {
  const [templates, setTemplates] = useState(() =>
    TEMPLATES_PADRAO.map(t => ({
      ...t,
      mensagens: t.mensagens.map(m => ({ ...m })),
    }))
  )
  const [aberto, setAberto] = useState<string>('anti_noshow')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  function atualizarTemplate(templateId: string, etapa: number, valor: string) {
    setTemplates(prev => prev.map(t =>
      t.id === templateId
        ? { ...t, mensagens: t.mensagens.map(m => m.etapa === etapa ? { ...m, template: valor } : m) }
        : t
    ))
  }

  async function handleSalvar() {
    setSalvando(true)
    setMensagem('')
    try {
      const dados: Record<string, string[]> = {}
      for (const t of templates) {
        dados[t.id] = t.mensagens.map(m => m.template)
      }
      await onSalvar(dados)
      setMensagem('Templates salvos!')
    } catch {
      setMensagem('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const VARIAVEIS = ['{nome}', '{servico}', '{data}', '{hora}', '{clinica}', '{beneficio}']

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-lg border p-3" style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-fundo)' }}>
        <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
          <strong>Variáveis disponíveis:</strong>{' '}
          {VARIAVEIS.map(v => (
            <code key={v} className="mr-2 px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}>
              {v}
            </code>
          ))}
        </p>
      </div>

      {templates.map(t => (
        <div key={t.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--cor-borda)' }}>
          <button
            onClick={() => setAberto(aberto === t.id ? '' : t.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            style={{ background: 'var(--cor-card)' }}
          >
            <div>
              <span className="font-medium text-sm" style={{ color: 'var(--cor-texto)' }}>{t.titulo}</span>
              <span className="ml-2 text-xs" style={{ color: 'var(--cor-texto-suave)' }}>{t.descricao}</span>
            </div>
            {aberto === t.id
              ? <ChevronDown size={15} style={{ color: 'var(--cor-texto-suave)' }} />
              : <ChevronRight size={15} style={{ color: 'var(--cor-texto-suave)' }} />
            }
          </button>

          {aberto === t.id && (
            <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-fundo)' }}>
              {t.mensagens.map(m => (
                <div key={m.etapa}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cor-texto)' }}>
                    {m.label}
                  </label>
                  <textarea
                    value={m.template}
                    onChange={e => atualizarTemplate(t.id, m.etapa, e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {mensagem && (
        <p className="text-sm" style={{ color: mensagem.includes('Erro') ? '#EF4444' : '#22C55E' }}>
          {mensagem}
        </p>
      )}

      <button onClick={handleSalvar} disabled={salvando}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--cor-primaria)' }}>
        {salvando && <Loader2 size={14} className="animate-spin" />}
        {salvando ? 'Salvando...' : 'Salvar templates'}
      </button>
    </div>
  )
}
