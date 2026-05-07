import { createClient } from '@/lib/supabase/server'

export type Papel = 'admin' | 'operador' | 'visualizador'

const PAPEL_RANKING: Record<Papel, number> = {
  visualizador: 1,
  operador: 2,
  admin: 3,
}

/**
 * Retorna o usuário autenticado junto com seu papel na clínica.
 * Retorna null se não autenticado ou sem vínculo com clínica.
 */
export async function getUsuarioComPapel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: vinculo } = await supabase
    .from('usuarios_clinicas')
    .select('clinica_id, papel')
    .eq('user_id', user.id)
    .maybeSingle()

  return vinculo ? { user, clinica_id: vinculo.clinica_id, papel: vinculo.papel as Papel } : null
}

/**
 * Verifica se o email é super-admin do sistema (acesso ao painel /admin).
 * Lê de ADMIN_EMAILS (lista separada por vírgula) ou ADMIN_EMAIL (legado).
 */
export function isSuperAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const fallback = process.env.ADMIN_EMAIL?.toLowerCase()
  return list.includes(email.toLowerCase()) ||
    (!!fallback && email.toLowerCase() === fallback)
}

/**
 * Retorna true se o papel do usuário atende ao mínimo exigido.
 * Ex: exigePapel('operador', 'operador') → true
 *     exigePapel('visualizador', 'operador') → false
 */
export function exigePapel(papel: Papel | undefined, minimo: Papel): boolean {
  if (!papel) return false
  return PAPEL_RANKING[papel] >= PAPEL_RANKING[minimo]
}
