'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { Lead } from '@/types'

interface GraficoOrigemLeadsProps {
  leads: Lead[]
}

const CORES = ['var(--cor-primaria)', 'var(--cor-destaque)', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

export function GraficoOrigemLeads({ leads }: GraficoOrigemLeadsProps) {
  const dados = useMemo(() => {
    const porOrigem: Record<string, number> = {}
    leads.forEach(l => {
      const origem = l.origem || 'Não informado'
      porOrigem[origem] = (porOrigem[origem] || 0) + 1
    })
    return Object.entries(porOrigem)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }, [leads])

  const semDados = dados.length === 0

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--cor-texto)' }}>
        Origem dos leads
      </h3>

      {semDados ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--cor-texto-suave)' }}>Nenhum lead ainda</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={dados} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {dados.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--cor-card)',
                border: '1px solid var(--cor-borda)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--cor-texto-suave)' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
