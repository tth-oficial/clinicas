import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { atualizarLeadSchema } from '@/lib/validators/leads'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let clinica
  try { clinica = await getClinicaDoUsuario(user.id) }
  catch { return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 }) }

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*, contatos(*)')
    .eq('id', id)
    .eq('clinica_id', clinica.id)
    .single()

  if (error || !lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('clinica_id', clinica.id)
    .eq('contato_id', lead.contato_id)
    .order('data_hora', { ascending: false })
    .limit(10)

  return NextResponse.json({ data: { ...lead, agendamentos: agendamentos || [] } })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let clinica
  try { clinica = await getClinicaDoUsuario(user.id) }
  catch { return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 }) }

  let dados
  try {
    dados = atualizarLeadSchema.parse(await request.json())
  } catch (err) {
    return NextResponse.json(
      { error: 'Dados inválidos', detalhes: err instanceof Error ? err.message : undefined },
      { status: 400 }
    )
  }

  if (Object.keys(dados).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ ...dados, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('clinica_id', clinica.id)
    .select('*, contatos(id, nome, telefone)')
    .single()

  if (error) {
    console.error('[PATCH /api/leads/[id]]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let clinica
  try { clinica = await getClinicaDoUsuario(user.id) }
  catch { return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 }) }

  const { error } = await supabase
    .from('leads')
    .update({ status: 'perdido', atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('clinica_id', clinica.id)

  if (error) {
    console.error('[DELETE /api/leads/[id]]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
