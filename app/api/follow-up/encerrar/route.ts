import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/follow-up/encerrar — encerra follow-up e marca lead como frio
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)
    const body = await request.json() as { cadencia_id: string }

    if (!body.cadencia_id) {
      return NextResponse.json({ error: 'cadencia_id obrigatório' }, { status: 400 })
    }

    const { data: cadencia, error: errCad } = await supabase
      .from('cadencias')
      .select('id, lead_id, status')
      .eq('id', body.cadencia_id)
      .eq('clinica_id', clinica.id)
      .eq('tipo', 'followup')
      .single()

    if (errCad || !cadencia) {
      return NextResponse.json({ error: 'Cadência não encontrada' }, { status: 404 })
    }

    await supabase
      .from('cadencias')
      .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
      .eq('id', cadencia.id)

    if (cadencia.lead_id) {
      await supabase
        .from('leads')
        .update({ temperatura: 'frio', atualizado_em: new Date().toISOString() })
        .eq('id', cadencia.lead_id)
        .eq('clinica_id', clinica.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/follow-up/encerrar] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
