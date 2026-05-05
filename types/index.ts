export interface Clinica {
  id: string
  nome: string
  logo_url: string | null
  responsavel: string | null
  especialidade: string | null
  cidade: string | null
  whatsapp: string | null
  plano: 'entrada' | 'medio' | 'alto'
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface ClinicaConfig {
  id: string
  clinica_id: string
  cor_principal: string
  cor_destaque: string
  cor_fundo: string
  cor_sidebar: string
  fonte: string
  logo_url: string | null
  favicon_url: string | null
  nome_exibicao: string | null
  slogan: string | null
  openai_api_key: string | null
  openai_model: string
  evolution_url: string | null
  evolution_api_key: string | null
  evolution_instance: string | null
  agente_nome: string
  agente_prompt: string | null
  agente_tom: string
  modulos_ativos: string[]
  google_calendar_token: Record<string, unknown> | null
  google_calendar_id: string | null
  // Escalação para humano
  telefone_escalacao: string | null
  notificar_escalacao: boolean
  atualizado_em: string
}

export interface Contato {
  id: string
  clinica_id: string
  nome: string
  telefone: string
  email: string | null
  origem: string | null
  notas: string | null
  ativo: boolean
  ultimo_atendimento: string | null
  total_procedimentos: number
  total_gasto: number
  criado_em: string
  atualizado_em: string
}

export type LeadEtapa = 'lead' | 'consulta_agendada' | 'negociacao' | 'procedimento' | 'pos_venda'
export type LeadTemperatura = 'quente' | 'morno' | 'frio'
export type LeadStatus = 'novo' | 'em_contato' | 'agendado' | 'negociando' | 'convertido' | 'perdido'

export interface Lead {
  id: string
  clinica_id: string
  contato_id: string
  servico: string
  valor_estimado: number | null
  origem: string | null
  etapa: LeadEtapa
  temperatura: LeadTemperatura
  status: LeadStatus
  posicao_kanban: number
  notas: string | null
  criado_em: string
  atualizado_em: string
  contatos?: Pick<Contato, 'id' | 'nome' | 'telefone'>
}

export type AgendamentoStatus = 'agendado' | 'confirmado' | 'realizado' | 'no_show' | 'cancelado' | 'remarcado'

export interface Agendamento {
  id: string
  clinica_id: string
  contato_id: string
  lead_id: string | null
  servico: string
  profissional: string | null
  data_hora: string
  duracao_minutos: number
  valor: number | null
  status: AgendamentoStatus
  notas: string | null
  criado_em: string
  atualizado_em: string
  contatos?: Pick<Contato, 'id' | 'nome' | 'telefone'>
}

export interface MetricaDiaria {
  id: string
  clinica_id: string
  data: string
  receita: number
  leads_novos: number
  consultas_realizadas: number
  procedimentos_realizados: number
  no_show_count: number
  no_show_total: number
  taxa_conversao: number | null
}

export interface KPIData {
  atual: number
  anterior: number
}

export interface DashboardKPIs {
  receita: KPIData
  leads: KPIData
  consultas: KPIData
  procedimentos: KPIData
  noShow: KPIData
  taxaConversao: KPIData
}
