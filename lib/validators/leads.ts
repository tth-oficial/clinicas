import { z } from 'zod'

export const ETAPAS_LEAD = [
  'lead', 'consulta_agendada', 'negociacao', 'procedimento', 'pos_venda',
] as const

export const STATUS_LEAD = [
  'novo', 'em_contato', 'agendado', 'negociando', 'convertido', 'perdido',
] as const

export const TEMPERATURA_LEAD = ['quente', 'morno', 'frio'] as const

/**
 * Allowlist explícita de campos editáveis em PATCH /api/leads/[id].
 * NUNCA inclui clinica_id, contato_id, id ou criado_em — esses são
 * imutáveis ou determinados pelo servidor.
 */
export const atualizarLeadSchema = z.object({
  servico:        z.string().min(1).max(200).optional(),
  valor_estimado: z.number().nonnegative().nullable().optional(),
  origem:         z.string().max(100).nullable().optional(),
  etapa:          z.enum(ETAPAS_LEAD).optional(),
  temperatura:    z.enum(TEMPERATURA_LEAD).optional(),
  status:         z.enum(STATUS_LEAD).optional(),
  posicao_kanban: z.number().int().nonnegative().optional(),
  notas:          z.string().max(5000).nullable().optional(),
}).strict()

export type AtualizarLeadInput = z.infer<typeof atualizarLeadSchema>
