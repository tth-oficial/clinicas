import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/relatorio?semana=YYYY-MM-DD — busca relatório da semana (ou o mais recente)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)
    const semanaParam = request.nextUrl.searchParams.get('semana')

    let query = supabase
      .from('relatorios')
      .select('*')
      .eq('clinica_id', clinica.id)

    if (semanaParam) {
      query = query.eq('semana_inicio', semanaParam)
    } else {
      query = query.order('semana_inicio', { ascending: false }).limit(1)
    }

    const { data: relatorios, error } = await query

    if (error) {
      console.error('[GET /api/relatorio]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Lista de semanas disponíveis para o selector
    const { data: semanas } = await supabase
      .from('relatorios')
      .select('semana_inicio, semana_fim, criado_em')
      .eq('clinica_id', clinica.id)
      .order('semana_inicio', { ascending: false })
      .limit(12)

    const relatorio = relatorios?.[0] ?? null

    return NextResponse.json({ relatorio, semanas: semanas ?? [] })
  } catch (err) {
    console.error('[GET /api/relatorio] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH /api/relatorio — atualizar ações recomendadas (marcar como concluída)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)
    const body = await request.json() as { relatorio_id: string; acoes: Array<{ texto: string; concluida: boolean }> }

    if (!body.relatorio_id || !body.acoes) {
      return NextResponse.json({ error: 'relatorio_id e acoes são obrigatórios' }, { status: 400 })
    }

    const { error } = await supabase
      .from('relatorios')
      .update({ acoes_recomendadas: body.acoes })
      .eq('id', body.relatorio_id)
      .eq('clinica_id', clinica.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/relatorio] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
