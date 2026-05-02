'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatarMoeda } from '@/lib/utils'
import type { MetricaDiaria } from '@/types'

interface GraficoReceitaProps {
  metricas: MetricaDiaria[]
}

export function GraficoReceita({ metricas }: GraficoReceitaProps) {
  const dados = useMemo(() => {
    const porMes: Record<string, number> = {}
    metricas.forEach(m => {
      const mes = m.data.slice(0, 7)
      porMes[mes] = (porMes[mes] || 0) + m.receita
    })
    return Object.entries(porMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, receita]) => ({
        mes: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(new Date(mes + '-01')),
        receita,
      }))
  }, [metricas])

  const semDados = dados.length === 0

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--cor-texto)' }}>
        Receita dos últimos 6 meses
      </h3>

      {semDados ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Nenhum dado disponível ainda</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cor-borda)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--cor-texto-suave)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--cor-texto-suave)' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) => formatarMoeda(Number(value ?? 0))}
              contentStyle={{
                background: 'var(--cor-card)',
                border: '1px solid var(--cor-borda)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="receita"
              stroke="var(--cor-primaria)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--cor-primaria)' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
