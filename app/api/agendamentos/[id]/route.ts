import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// PATCH /api/agendamentos/[id]
// Atualiza status do agendamento
// ─────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const body = await request.json() as {
      status?: string
      profissional?: string
      notas?: string
      valor?: number
      data_hora?: string
      duracao_minutos?: number
    }

    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .update({ ...body, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('clinica_id', clinica.id)
      .select('*, contatos(id, nome, telefone)')
      .single()

    if (error) {
      console.error('[PATCH /api/agendamentos/[id]]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Se marcou como realizado → atualiza lead para pos_venda
    if (body.status === 'realizado' && agendamento.lead_id) {
      await supabase
        .from('leads')
        .update({ etapa: 'pos_venda', status: 'convertido', atualizado_em: new Date().toISOString() })
        .eq('id', agendamento.lead_id)
        .eq('clinica_id', clinica.id)
    }

    // Se marcou como no_show → cancela cadência ativa
    if (body.status === 'no_show') {
      await supabase
        .from('cadencias')
        .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
        .eq('agendamento_id', id)
        .eq('clinica_id', clinica.id)
        .eq('tipo', 'anti_noshow')
        .eq('status', 'ativa')
    }

    // Se marcou como cancelado → cancela cadência ativa
    if (body.status === 'cancelado') {
      await supabase
        .from('cadencias')
        .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
        .eq('agendamento_id', id)
        .eq('clinica_id', clinica.id)
        .eq('tipo', 'anti_noshow')
        .eq('status', 'ativa')
    }

    return NextResponse.json({ agendamento })
  } catch (err) {
    console.error('[PATCH /api/agendamentos/[id]] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE /api/agendamentos/[id]
// Soft delete (cancela)
// ─────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado', atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('clinica_id', clinica.id)

    if (error) {
      console.error('[DELETE /api/agendamentos/[id]]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Cancela cadência anti no-show associada
    await supabase
      .from('cadencias')
      .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
      .eq('agendamento_id', id)
      .eq('clinica_id', clinica.id)
      .eq('tipo', 'anti_noshow')
      .eq('status', 'ativa')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/agendamentos/[id]] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
