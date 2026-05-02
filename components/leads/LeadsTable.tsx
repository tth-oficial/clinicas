'use client'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/shared/Badge'
import { formatarMoeda } from '@/lib/utils'
import type { Lead } from '@/types'

type LeadComContato = Lead & { contatos?: { id: string; nome: string; telefone: string } }

const TEMP_BADGE: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  quente: 'erro', morno: 'aviso', frio: 'neutro',
}
const TEMP_LABEL: Record<string, string> = {
  quente: '🔥 Quente', morno: '🌡 Morno', frio: '❄ Frio',
}
const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  novo: 'neutro', em_contato: 'primario', agendado: 'destaque',
  negociando: 'aviso', convertido: 'destaque', perdido: 'erro',
}
const STATUS_LABEL: Record<string, string> = {
  novo: 'Novo', em_contato: 'Em contato', agendado: 'Agendado',
  negociando: 'Negociando', convertido: 'Convertido', perdido: 'Perdido',
}

interface LeadsTableProps {
  leads: LeadComContato[]
  total: number
  page: number
  limit: number
}

const columnHelper = createColumnHelper<LeadComContato>()

export function LeadsTable({ leads, total, page, limit }: LeadsTableProps) {
  const router = useRouter()
  const [data, setData] = useState(leads)

  const handleDelete = async (id: string) => {
    if (!confirm('Marcar este lead como perdido?')) return
    const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setData(prev => prev.filter(l => l.id !== id))
      toast.success('Lead removido')
    } else {
      toast.error('Erro ao remover lead')
    }
  }

  const columns = [
    columnHelper.accessor(row => row.contatos?.nome ?? '—', {
      id: 'contato',
      header: 'Contato',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--cor-texto)' }}>
            {row.original.contatos?.nome ?? '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
            {row.original.contatos?.telefone ?? '—'}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor('servico', {
      header: 'Serviço',
      cell: ({ getValue }) => (
        <span className="text-sm" style={{ color: 'var(--cor-texto)' }}>{getValue()}</span>
      ),
    }),
    columnHelper.accessor('origem', {
      header: 'Origem',
      cell: ({ getValue }) => (
        <Badge variant="neutro">{getValue() ?? '—'}</Badge>
      ),
    }),
    columnHelper.accessor('temperatura', {
      header: 'Temperatura',
      cell: ({ getValue }) => (
        <Badge variant={TEMP_BADGE[getValue()] ?? 'neutro'}>
          {TEMP_LABEL[getValue()] ?? getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant={STATUS_BADGE[getValue()] ?? 'neutro'}>
          {STATUS_LABEL[getValue()] ?? getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('atualizado_em', {
      header: 'Último contato',
      cell: ({ getValue }) => (
        <span className="text-sm whitespace-nowrap" style={{ color: 'var(--cor-texto-suave)' }}>
          {formatDistanceToNow(new Date(getValue()), { locale: ptBR, addSuffix: true })}
        </span>
      ),
    }),
    columnHelper.accessor('valor_estimado', {
      header: 'Valor',
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold" style={{ color: 'var(--cor-primaria)' }}>
          {getValue() != null ? formatarMoeda(getValue()!) : '—'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/leads/${row.original.id}`}
            className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: 'var(--cor-fundo)', border: '1px solid var(--cor-borda)' }}
          >
            <Eye size={13} style={{ color: 'var(--cor-texto-suave)' }} />
          </Link>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <Trash2 size={13} style={{ color: '#EF4444' }} />
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  const totalPages = Math.ceil(total / limit)

  const navPage = (newPage: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', String(newPage))
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--cor-borda)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr
                  key={hg.id}
                  style={{ background: 'var(--cor-fundo)', borderBottom: '1px solid var(--cor-borda)' }}
                >
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--cor-texto-suave)' }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-14 text-sm"
                    style={{ color: 'var(--cor-texto-suave)', background: 'var(--cor-card)' }}
                  >
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      background:    i % 2 === 0 ? 'var(--cor-card)' : 'color-mix(in srgb, var(--cor-card) 94%, var(--cor-fundo))',
                      borderBottom:  '1px solid var(--cor-borda)',
                    }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--cor-texto-suave)' }}>
            Página {page} de {totalPages} · {total} leads
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => navPage(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
            >
              <ChevronLeft size={13} /> Anterior
            </button>
            <button
              onClick={() => navPage(page + 1)}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: 'var(--cor-card)', border: '1px solid var(--cor-borda)', color: 'var(--cor-texto)' }}
            >
              Próxima <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
