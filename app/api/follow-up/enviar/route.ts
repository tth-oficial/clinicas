import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { createEvolutionClient } from '@/lib/evolution'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/follow-up/enviar — envia etapa pendente de uma cadência manualmente
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

    // Buscar cadência com etapas e contato
    const { data: cadencia, error: errCad } = await supabase
      .from('cadencias')
      .select(`
        id, etapa_atual, total_etapas, status,
        contatos (id, nome, telefone),
        cadencia_etapas (id, numero, mensagem_template, status)
      `)
      .eq('id', body.cadencia_id)
      .eq('clinica_id', clinica.id)
      .eq('tipo', 'followup')
      .single()

    if (errCad || !cadencia) {
      return NextResponse.json({ error: 'Cadência não encontrada' }, { status: 404 })
    }

    if (cadencia.status !== 'ativa') {
      return NextResponse.json({ error: 'Cadência não está ativa' }, { status: 400 })
    }

    const contato = cadencia.contatos as unknown as { id: string; nome: string; telefone: string } | null
    if (!contato) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })

    const etapas = cadencia.cadencia_etapas as unknown as Array<{ id: string; numero: number; mensagem_template: string; status: string }>
    const proxima = etapas.find(e => e.numero === cadencia.etapa_atual + 1 && e.status === 'pendente')

    if (!proxima) {
      return NextResponse.json({ error: 'Nenhuma etapa pendente' }, { status: 400 })
    }

    const evolution = await createEvolutionClient(clinica.id)
    await evolution.sendText(contato.telefone, proxima.mensagem_template)

    await supabase
      .from('cadencia_etapas')
      .update({ status: 'enviado', enviado_em: new Date().toISOString() })
      .eq('id', proxima.id)

    const novaEtapa = cadencia.etapa_atual + 1
    const proxima_execucao = new Date()
    proxima_execucao.setDate(proxima_execucao.getDate() + (novaEtapa === 1 ? 2 : 3))

    if (novaEtapa >= cadencia.total_etapas) {
      await supabase
        .from('cadencias')
        .update({ etapa_atual: novaEtapa, status: 'concluida', proxima_execucao: null, atualizado_em: new Date().toISOString() })
        .eq('id', cadencia.id)
    } else {
      await supabase
        .from('cadencias')
        .update({ etapa_atual: novaEtapa, proxima_execucao: proxima_execucao.toISOString(), atualizado_em: new Date().toISOString() })
        .eq('id', cadencia.id)
    }

    return NextResponse.json({ ok: true, etapa_enviada: proxima.numero })
  } catch (err) {
    console.error('[POST /api/follow-up/enviar] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
