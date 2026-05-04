import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/campanhas/reaquecimento/[id]/disparar
// Ativa a campanha e popula campanha_contatos com os elegíveis
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)
    const { id } = await params

    const { data: campanha, error: errCamp } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', id)
      .eq('clinica_id', clinica.id)
      .single()

    if (errCamp || !campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    if (!['rascunho', 'pausada'].includes(campanha.status)) {
      return NextResponse.json({ error: 'Campanha já está ativa ou concluída' }, { status: 400 })
    }

    // Buscar contatos elegíveis (inativos há X meses)
    const corteInatividade = new Date()
    corteInatividade.setMonth(corteInatividade.getMonth() - (campanha.periodo_inatividade_meses ?? 3))

    const { data: contatos } = await supabase
      .from('contatos')
      .select('id')
      .eq('clinica_id', clinica.id)
      .eq('ativo', true)
      .or(`ultimo_atendimento.is.null,ultimo_atendimento.lte.${corteInatividade.toISOString()}`)

    if (!contatos || contatos.length === 0) {
      return NextResponse.json({ error: 'Nenhum contato elegível encontrado' }, { status: 400 })
    }

    // Inserir registros em campanha_contatos (ignora duplicados)
    const registros = contatos.map(c => ({
      campanha_id: id,
      clinica_id: clinica.id,
      contato_id: c.id,
      status: 'pendente',
    }))

    await supabase
      .from('campanha_contatos')
      .upsert(registros, { onConflict: 'campanha_id,contato_id', ignoreDuplicates: true })

    // Ativar campanha
    await supabase
      .from('campanhas')
      .update({
        status: 'ativa',
        total_contatos: contatos.length,
        disparado_em: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({ ok: true, total_contatos: contatos.length })
  } catch (err) {
    console.error('[POST /api/campanhas/reaquecimento/[id]/disparar] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
