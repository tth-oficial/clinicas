import { createClient } from './server'
import type { Clinica } from '@/types'

export async function getClinicaDoUsuario(userId: string): Promise<Clinica> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuarios_clinicas')
    .select('clinica_id, clinicas(id, nome, logo_url, responsavel, especialidade, cidade, whatsapp, plano, ativo, criado_em, atualizado_em)')
    .eq('user_id', userId)
    .single()

  if (error || !data?.clinicas) {
    throw new Error('Clínica não encontrada para este usuário')
  }

  return data.clinicas as unknown as Clinica
}
