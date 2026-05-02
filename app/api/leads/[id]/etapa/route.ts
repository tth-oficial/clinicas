import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextResponse } from 'next/server'

const ETAPAS_VALIDAS = ['lead', 'consulta_agendada', 'negociacao', 'procedimento', 'pos_venda'] as const
type Etapa = typeof ETAPAS_VALIDAS[number]

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let clinica
  try { clinica = await getClinicaDoUsuario(user.id) }
  catch { return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 }) }

  const body = await request.json()
  const { etapa }: { etapa: Etapa } = body

  if (!ETAPAS_VALIDAS.includes(etapa)) {
    return NextResponse.json({ error: `Etapa inválida. Válidas: ${ETAPAS_VALIDAS.join(', ')}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ etapa, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('clinica_id', clinica.id)
    .select('*, contatos(id, nome, telefone)')
    .single()

  if (error) {
    console.error('[PATCH /api/leads/[id]/etapa]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
