import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// PATCH /api/profissionais/[id]
// Edita dados do profissional
// ─────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)
    const { id } = await params

    const body = await request.json() as {
      nome?: string
      especialidade?: string
      telefone?: string
      email?: string
      cor?: string
      ativo?: boolean
    }

    // Garante que o profissional pertence à clínica do usuário
    const { data: existente } = await supabase
      .from('profissionais')
      .select('id')
      .eq('id', id)
      .eq('clinica_id', clinica.id)
      .single()

    if (!existente) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    const campos: Record<string, unknown> = {}
    if (body.nome !== undefined) campos.nome = body.nome.trim()
    if (body.especialidade !== undefined) campos.especialidade = body.especialidade
    if (body.telefone !== undefined) campos.telefone = body.telefone
    if (body.email !== undefined) campos.email = body.email
    if (body.cor !== undefined) campos.cor = body.cor
    if (body.ativo !== undefined) campos.ativo = body.ativo

    if (Object.keys(campos).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data: profissional, error } = await supabase
      .from('profissionais')
      .update(campos)
      .eq('id', id)
      .eq('clinica_id', clinica.id)
      .select('*')
      .single()

    if (error) {
      console.error('[PATCH /api/profissionais/[id]]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profissional })
  } catch (err) {
    console.error('[PATCH /api/profissionais/[id]] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE /api/profissionais/[id]
// Soft delete: marca ativo = false
// ─────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)
    const { id } = await params

    const { error } = await supabase
      .from('profissionais')
      .update({ ativo: false })
      .eq('id', id)
      .eq('clinica_id', clinica.id)

    if (error) {
      console.error('[DELETE /api/profissionais/[id]]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error('[DELETE /api/profissionais/[id]] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
