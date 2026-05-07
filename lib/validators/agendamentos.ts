import { z } from 'zod'

export const STATUS_AGENDAMENTO = [
  'agendado', 'confirmado', 'realizado', 'no_show', 'cancelado', 'remarcado',
] as const

const isoDateTime = z.string().refine(
  (s) => !Number.isNaN(new Date(s).getTime()),
  'data_hora deve ser ISO 8601 válido'
)

/**
 * Criação de agendamento. clinica_id vem da sessão; contato_id é
 * validado contra a clínica em runtime na rota.
 */
export const criarAgendamentoSchema = z.object({
  contato_id:       z.string().uuid(),
  lead_id:          z.string().uuid().nullable().optional(),
  servico:          z.string().min(1).max(200),
  servico_id:       z.string().uuid().nullable().optional(),
  profissional:     z.string().max(200).nullable().optional(),
  profissional_id:  z.string().uuid().nullable().optional(),
  data_hora:        isoDateTime,
  duracao_minutos:  z.number().int().positive().max(720).optional(),
  valor:            z.number().nonnegative().nullable().optional(),
  notas:            z.string().max(5000).nullable().optional(),
}).strict()

/**
 * Allowlist de PATCH. clinica_id, contato_id, id, criado_em ficam
 * fora intencionalmente.
 */
export const atualizarAgendamentoSchema = z.object({
  status:           z.enum(STATUS_AGENDAMENTO).optional(),
  servico:          z.string().min(1).max(200).optional(),
  servico_id:       z.string().uuid().nullable().optional(),
  profissional:     z.string().max(200).nullable().optional(),
  profissional_id:  z.string().uuid().nullable().optional(),
  data_hora:        isoDateTime.optional(),
  duracao_minutos:  z.number().int().positive().max(720).optional(),
  valor:            z.number().nonnegative().nullable().optional(),
  notas:            z.string().max(5000).nullable().optional(),
}).strict()

export type CriarAgendamentoInput = z.infer<typeof criarAgendamentoSchema>
export type AtualizarAgendamentoInput = z.infer<typeof atualizarAgendamentoSchema>
