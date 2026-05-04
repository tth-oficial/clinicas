'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart2, Printer, RefreshCw, CheckSquare, Square,
  TrendingUp, TrendingDown, Minus, ChevronDown,
} from 'lucide-react'

interface MetricasSemana {
  receita: number
  leads: number
  consultas: number
  procedimentos: number
  no_show: number
  taxa_conversao: number
}

interface Metricas {
  atual: MetricasSemana
  anterior: MetricasSemana
  variacao: {
    receita: number
    leads: number
    consultas: number
    no_show: number
    procedimentos: number
    taxa_conversao: number
  }
}

interface AcaoRecomendada {
  texto: string
  concluida: boolean
}

interface Relatorio {
  id: string
  semana_inicio: string
  semana_fim: string
  resumo_ia: string
  acoes_recomendadas: AcaoRecomendada[]
  metricas: Metricas
  criado_em: string
}

interface SemanaDisponivel {
  semana_inicio: string
  semana_fim: string
  criado_em: string
}

function formatarSemana(inicio: string, fim: string) {
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  return `${fmt(inicio)} – ${fmt(fim)}`
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Variacao({ pct }: { pct: number }) {
  if (Math.abs(pct) < 0.5) {
    return <span className="flex items-center gap-0.5 text-xs" style={{ color: '#9CA3AF' }}><Minus size={11} /> 0%</span>
  }
  const positivo = pct > 0
  const cor = positivo ? '#22C55E' : '#EF4444'
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: cor }}>
      {positivo ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {positivo ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function CardKPI({ label, valor, variacao, format }: {
  label: string
  valor: number
  variacao: number
  format: 'moeda' | 'numero' | 'pct'
}) {
  const valorFormatado = format === 'moeda'
    ? formatarMoeda(valor)
    : format === 'pct'
      ? `${valor.toFixed(1)}%`
      : valor.toString()

  return (
    <div
      className="p-4 rounded-2xl"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <p className="text-xs mb-2" style={{ color: 'var(--cor-texto-suave)' }}>{label}</p>
      <p className="text-2xl font-black mb-1" style={{ color: 'var(--cor-texto)' }}>{valorFormatado}</p>
      <Variacao pct={variacao} />
    </div>
  )
}

function ResumoIA({ texto }: { texto: string }) {
  const html = texto
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, '<br />')

  return (
    <div
      className="p-5 rounded-2xl"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--cor-destaque)' }}
        >
          <BarChart2 size={15} color="#fff" />
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--cor-texto)' }}>Resumo Executivo — IA</span>
      </div>
      <div
        className="text-sm leading-relaxed"
        style={{ color: 'var(--cor-texto)' }}
        dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
      />
    </div>
  )
}

function ListaAcoes({
  relatorio,
  onToggle,
}: {
  relatorio: Relatorio
  onToggle: (idx: number) => void
}) {
  const acoes = relatorio.acoes_recomendadas ?? []

  return (
    <div
      className="p-5 rounded-2xl"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <p className="font-bold text-sm mb-3" style={{ color: 'var(--cor-texto)' }}>
        Ações recomendadas
      </p>
      {acoes.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Nenhuma ação registrada.</p>
      ) : (
        <div className="space-y-2">
          {acoes.map((acao, idx) => (
            <button
              key={idx}
              onClick={() => onToggle(idx)}
              className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all hover:opacity-90"
              style={{
                background: acao.concluida ? 'rgba(34,197,94,0.06)' : 'var(--cor-fundo)',
                border: `1px solid ${acao.concluida ? 'rgba(34,197,94,0.2)' : 'var(--cor-borda)'}`,
              }}
            >
              {acao.concluida
                ? <CheckSquare size={16} style={{ color: '#22C55E', flexShrink: 0, marginTop: 1 }} />
                : <Square size={16} style={{ color: 'var(--cor-texto-suave)', flexShrink: 0, marginTop: 1 }} />}
              <span
                className="text-sm"
                style={{
                  color: acao.concluida ? '#22C55E' : 'var(--cor-texto)',
                  textDecoration: acao.concluida ? 'line-through' : 'none',
                  opacity: acao.concluida ? 0.7 : 1,
                }}
              >
                {acao.texto}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PainelRelatorio() {
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [semanas, setSemanas] = useState<SemanaDisponivel[]>([])
  const [semanaSelecionada, setSemanaSelecionada] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvandoAcoes, setSalvandoAcoes] = useState(false)

  const carregar = useCallback(async (semana?: string) => {
    setCarregando(true)
    try {
      const url = semana ? `/api/relatorio?semana=${semana}` : '/api/relatorio'
      const res = await fetch(url)
      const json = await res.json() as { relatorio: Relatorio | null; semanas: SemanaDisponivel[] }
      setRelatorio(json.relatorio)
      setSemanas(json.semanas ?? [])
      if (!semana && json.relatorio) {
        setSemanaSelecionada(json.relatorio.semana_inicio)
      }
    } catch {
      setRelatorio(null)
    } finally {
      setCarregando(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregar() }, [carregar])

  const handleSemanaChange = (semana: string) => {
    setSemanaSelecionada(semana)
    void carregar(semana)
  }

  const handleToggleAcao = async (idx: number) => {
    if (!relatorio) return

    const novasAcoes = relatorio.acoes_recomendadas.map((a, i) =>
      i === idx ? { ...a, concluida: !a.concluida } : a
    )
    setRelatorio({ ...relatorio, acoes_recomendadas: novasAcoes })

    setSalvandoAcoes(true)
    try {
      await fetch('/api/relatorio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relatorio_id: relatorio.id, acoes: novasAcoes }),
      })
    } finally {
      setSalvandoAcoes(false)
    }
  }

  const handleExportarPDF = () => {
    window.print()
  }

  if (carregando) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--cor-card)' }} />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Controles */}
      <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-2">
          {semanas.length > 0 && (
            <div className="relative">
              <select
                value={semanaSelecionada ?? ''}
                onChange={e => handleSemanaChange(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--cor-card)',
                  border: '1px solid var(--cor-borda)',
                  color: 'var(--cor-texto)',
                }}
              >
                {semanas.map(s => (
                  <option key={s.semana_inicio} value={s.semana_inicio}>
                    {formatarSemana(s.semana_inicio, s.semana_fim)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--cor-texto-suave)' }}
              />
            </div>
          )}

          <button
            onClick={() => void carregar(semanaSelecionada ?? undefined)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ background: 'var(--cor-fundo)', color: 'var(--cor-texto-suave)', border: '1px solid var(--cor-borda)' }}
          >
            <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {relatorio && (
          <button
            onClick={handleExportarPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'var(--cor-destaque)', color: '#fff' }}
          >
            <Printer size={15} />
            Exportar PDF
          </button>
        )}
      </div>

      {/* Conteúdo do relatório */}
      {!relatorio ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
        >
          <BarChart2 size={44} style={{ color: 'var(--cor-borda)' }} className="mb-3" />
          <p className="font-medium text-lg" style={{ color: 'var(--cor-texto)' }}>
            Nenhum relatório disponível
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--cor-texto-suave)' }}>
            O relatório semanal é gerado automaticamente toda segunda-feira às 07h
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Cabeçalho do relatório (visível no PDF) */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-black">Relatório Semanal</h1>
            <p className="text-gray-500">{formatarSemana(relatorio.semana_inicio, relatorio.semana_fim)}</p>
          </div>

          {/* KPIs */}
          {relatorio.metricas && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <CardKPI
                label="Receita"
                valor={relatorio.metricas.atual.receita}
                variacao={relatorio.metricas.variacao.receita}
                format="moeda"
              />
              <CardKPI
                label="Leads novos"
                valor={relatorio.metricas.atual.leads}
                variacao={relatorio.metricas.variacao.leads}
                format="numero"
              />
              <CardKPI
                label="Consultas"
                valor={relatorio.metricas.atual.consultas}
                variacao={relatorio.metricas.variacao.consultas}
                format="numero"
              />
              <CardKPI
                label="Procedimentos"
                valor={relatorio.metricas.atual.procedimentos}
                variacao={relatorio.metricas.variacao.procedimentos}
                format="numero"
              />
              <CardKPI
                label="No-show"
                valor={relatorio.metricas.atual.no_show}
                variacao={relatorio.metricas.variacao.no_show}
                format="numero"
              />
              <CardKPI
                label="Taxa de conversão"
                valor={relatorio.metricas.atual.taxa_conversao}
                variacao={relatorio.metricas.variacao.taxa_conversao}
                format="pct"
              />
            </div>
          )}

          {/* Resumo da IA */}
          <ResumoIA texto={relatorio.resumo_ia} />

          {/* Ações recomendadas */}
          <ListaAcoes
            relatorio={relatorio}
            onToggle={(idx) => void handleToggleAcao(idx)}
          />

          {salvandoAcoes && (
            <p className="text-xs text-center" style={{ color: 'var(--cor-texto-suave)' }}>Salvando...</p>
          )}
        </div>
      )}

      {/* CSS de impressão */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          main, main * { visibility: visible; }
          main { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </>
  )
}
