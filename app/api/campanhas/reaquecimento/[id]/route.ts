import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/campanhas/reaquecimento/[id] — status da campanha
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)
    const { id } = await params

    const { data: campanha, error } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', id)
      .eq('clinica_id', clinica.id)
      .single()

    if (error || !campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    // Buscar amostra de contatos que responderam
    const { data: responderam } = await supabase
      .from('campanha_contatos')
      .select(`
        id, status, enviado_em, respondeu_em,
        contatos (id, nome, telefone)
      `)
      .eq('campanha_id', id)
      .eq('status', 'respondeu')
      .order('respondeu_em', { ascending: false })
      .limit(20)

    return NextResponse.json({ campanha, responderam: responderam ?? [] })
  } catch (err) {
    console.error('[GET /api/campanhas/reaquecimento/[id]] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH /api/campanhas/reaquecimento/[id] — pausar ou retomar
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

    const { data: campanha, error } = await supabase
      .from('campanhas')
      .update({ status: body.status })
      .eq('id', id)
      .eq('clinica_id', clinica.id)
      .select('*')
      .single()

    if (error || !campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ campanha })
  } catch (err) {
    console.error('[PATCH /api/campanhas/reaquecimento/[id]] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
