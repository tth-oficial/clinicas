import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// PATCH /api/servicos/[id]
// Edita dados do serviço
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
      descricao?: string
      duracao_minutos?: number
      valor?: number
      ativo?: boolean
    }

    // Garante que o serviço pertence à clínica do usuário
    const { data: existente } = await supabase
      .from('servicos')
      .select('id')
      .eq('id', id)
      .eq('clinica_id', clinica.id)
      .single()

    if (!existente) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    const campos: Record<string, unknown> = {}
    if (body.nome !== undefined) campos.nome = body.nome.trim()
    if (body.descricao !== undefined) campos.descricao = body.descricao
    if (body.duracao_minutos !== undefined) campos.duracao_minutos = body.duracao_minutos
    if (body.valor !== undefined) campos.valor = body.valor
    if (body.ativo !== undefined) campos.ativo = body.ativo

    if (Object.keys(campos).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { data: servico, error } = await supabase
      .from('servicos')
      .update(campos)
      .eq('id', id)
      .eq('clinica_id', clinica.id)
      .select('*')
      .single()

    if (error) {
      console.error('[PATCH /api/servicos/[id]]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ servico })
  } catch (err) {
    console.error('[PATCH /api/servicos/[id]] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE /api/servicos/[id]
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
      .from('servicos')
      .update({ ativo: false })
      .eq('id', id)
      .eq('clinica_id', clinica.id)

    if (error) {
      console.error('[DELETE /api/servicos/[id]]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true })
  } catch (err) {
    console.error('[DELETE /api/servicos/[id]] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
