'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'

const DIAS = [
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
  { id: 6, label: 'Sábado' },
]

interface HorarioDia {
  dia_semana: number
  ativo: boolean
  hora_inicio: string
  hora_fim: string
}

const horarioPadrao = (dia: number): HorarioDia => ({
  dia_semana: dia,
  ativo: dia >= 1 && dia <= 5, // seg-sex por padrão
  hora_inicio: '08:00',
  hora_fim: '18:00',
})

export function AbaHorarios() {
  const [horarios, setHorarios] = useState<HorarioDia[]>(
    DIAS.map(d => horarioPadrao(d.id))
  )
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/horarios')
      .then(r => r.json())
      .then((data: HorarioDia[]) => {
        // Garantir que todos os 7 dias existam
        const mapa = new Map(data.map(h => [h.dia_semana, h]))
        setHorarios(DIAS.map(d => mapa.get(d.id) ?? horarioPadrao(d.id)))
      })
      .catch(() => {/* mantém padrão */})
      .finally(() => setCarregando(false))
  }, [])

  function atualizar(diaId: number, campo: keyof HorarioDia, valor: boolean | string) {
    setHorarios(prev =>
      prev.map(h =>
        h.dia_semana === diaId ? { ...h, [campo]: valor } : h
      )
    )
  }

  async function salvar() {
    setSalvando(true)
    setMsg('')
    try {
      const res = await fetch('/api/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horarios }),
      })
      if (!res.ok) throw new Error()
      setMsg('Horários salvos!')
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setMsg('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-8" style={{ color: 'var(--cor-texto-suave)' }}>
        <Loader2 size={18} className="animate-spin mr-2" /> Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--cor-texto)' }}>
          Horários de funcionamento
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--cor-texto-suave)' }}>
          A IA só oferecerá horários dentro deste intervalo
        </p>
      </div>

      <div className="space-y-2">
        {DIAS.map(dia => {
          const h = horarios.find(x => x.dia_semana === dia.id)!
          return (
            <div
              key={dia.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
              style={{
                borderColor: h.ativo ? 'var(--cor-primaria)' : 'var(--cor-borda)',
                background: h.ativo ? 'rgba(27,94,79,0.04)' : 'var(--cor-card)',
                opacity: h.ativo ? 1 : 0.65,
              }}
            >
              {/* Toggle ativo */}
              <button
                onClick={() => atualizar(dia.id, 'ativo', !h.ativo)}
                className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
                style={{ background: h.ativo ? 'var(--cor-primaria)' : 'var(--cor-borda)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: h.ativo ? '18px' : '2px' }}
                />
              </button>

              {/* Label dia */}
              <span
                className="text-sm font-medium w-28 flex-shrink-0"
                style={{ color: 'var(--cor-texto)' }}
              >
                {dia.label}
              </span>

              {/* Horários */}
              {h.ativo ? (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={h.hora_inicio}
                    onChange={e => atualizar(dia.id, 'hora_inicio', e.target.value)}
                    className="px-2 py-1 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>até</span>
                  <input
                    type="time"
                    value={h.hora_fim}
                    onChange={e => atualizar(dia.id, 'hora_fim', e.target.value)}
                    className="px-2 py-1 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-texto)', background: 'var(--cor-card)' }}
                  />
                </div>
              ) : (
                <span className="ml-auto text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
                  Fechado
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: 'var(--cor-primaria)' }}
        >
          {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {salvando ? 'Salvando...' : 'Salvar horários'}
        </button>
        {msg && (
          <span className="text-sm" style={{ color: msg.includes('Erro') ? '#EF4444' : '#22C55E' }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}
