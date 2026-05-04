import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/nutricao/[id] — pausar ou retomar sequência de nutrição
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
    const body = await request.json() as { status: 'ativa' | 'pausada' }

    if (!['ativa', 'pausada'].includes(body.status)) {
      return NextResponse.json({ error: 'status deve ser ativa ou pausada' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cadencias')
      .update({ status: body.status, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('clinica_id', clinica.id)
      .eq('tipo', 'nutricao')
      .select('id, status')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Cadência não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, status: data.status })
  } catch (err) {
    console.error('[PATCH /api/nutricao/[id]] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
