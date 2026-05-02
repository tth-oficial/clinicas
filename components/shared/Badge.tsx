import { cn } from '@/lib/utils'

type BadgeVariant = 'primario' | 'destaque' | 'erro' | 'aviso' | 'neutro'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const VARIANTS: Record<BadgeVariant, React.CSSProperties> = {
  primario: {
    background: 'color-mix(in srgb, var(--cor-primaria) 15%, transparent)',
    color: 'var(--cor-primaria)',
  },
  destaque: {
    background: 'color-mix(in srgb, var(--cor-destaque) 15%, transparent)',
    color: 'var(--cor-destaque)',
  },
  erro: {
    background: 'rgba(239,68,68,0.12)',
    color: '#EF4444',
  },
  aviso: {
    background: 'rgba(245,158,11,0.12)',
    color: '#F59E0B',
  },
  neutro: {
    background: 'color-mix(in srgb, var(--cor-borda) 50%, transparent)',
    color: 'var(--cor-texto-suave)',
  },
}

export function Badge({ variant = 'neutro', children, className }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', className)}
      style={VARIANTS[variant]}
    >
      {children}
    </span>
  )
}
