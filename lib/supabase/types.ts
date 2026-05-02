// Tipos gerados automaticamente pelo Supabase CLI.
// Para regenerar: npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      clinicas: {
        Row: {
          id: string
          nome: string
          logo_url: string | null
          responsavel: string | null
          especialidade: string | null
          cidade: string | null
          whatsapp: string | null
          plano: string
          ativo: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: Omit<Database['public']['Tables']['clinicas']['Row'], 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Database['public']['Tables']['clinicas']['Insert']>
      }
      contatos: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['contatos']['Row'], 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Database['public']['Tables']['contatos']['Insert']>
      }
      leads: {
        Row: {
          id: string
          clinica_id: string
          contato_id: string
          servico: string
          valor_estimado: number | null
          origem: string | null
          etapa: string
          temperatura: string
          status: string
          posicao_kanban: number
          notas: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      agendamentos: {
        Row: {
          id: string
          clinica_id: string
          contato_id: string
          lead_id: string | null
          servico: string
          profissional: string | null
          data_hora: string
          duracao_minutos: number
          valor: number | null
          status: string
          notas: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: Omit<Database['public']['Tables']['agendamentos']['Row'], 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Database['public']['Tables']['agendamentos']['Insert']>
      }
      metricas_diarias: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['metricas_diarias']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['metricas_diarias']['Insert']>
      }
    }
  }
}
