import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'
import { createEvolutionClient } from '@/lib/evolution'

// ─────────────────────────────────────────────
// POST /api/anti-noshow/enviar
// Envia manualmente a próxima etapa de uma cadência
// ─────────────────────────────────────────────
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

    // Buscar cadência com detalhes
    const { data: cadencia, error: errCad } = await supabase
      .from('cadencias')
      .select(`
        id,
        clinica_id,
        etapa_atual,
        total_etapas,
        status,
        agendamento_id,
        cadencia_etapas (
          id, numero, mensagem_template, status
        ),
        contatos (
          id, nome, telefone
        ),
        agendamentos (
          id, servico, data_hora, status
        )
      `)
      .eq('id', body.cadencia_id)
      .eq('clinica_id', clinica.id)
      .eq('tipo', 'anti_noshow')
      .single()

    if (errCad || !cadencia) {
      return NextResponse.json({ error: 'Cadência não encontrada' }, { status: 404 })
    }

    if (cadencia.status !== 'ativa') {
      return NextResponse.json({ error: 'Cadência não está ativa' }, { status: 400 })
    }

    const contato = cadencia.contatos as unknown as { id: string; nome: string; telefone: string } | null
    if (!contato) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
    }

    const etapas = cadencia.cadencia_etapas as unknown as Array<{ id: string; numero: number; mensagem_template: string; status: string }>
    const etapaAtual = etapas.find(e => e.numero === cadencia.etapa_atual + 1)

    if (!etapaAtual || etapaAtual.status === 'enviado') {
      return NextResponse.json({ error: 'Nenhuma etapa pendente para enviar' }, { status: 400 })
    }

    // Enviar via Evolution API
    const evolution = await createEvolutionClient(clinica.id)
    await evolution.sendText(contato.telefone, etapaAtual.mensagem_template)

    // Marcar etapa como enviada
    await supabase
      .from('cadencia_etapas')
      .update({ status: 'enviado', enviado_em: new Date().toISOString() })
      .eq('id', etapaAtual.id)

    // Avançar cadência
    const proximaEtapa = cadencia.etapa_atual + 1
    const agendamento = cadencia.agendamentos as unknown as { id: string; servico: string; data_hora: string; status: string } | null

    let proximaExecucao: string | null = null
    if (agendamento && proximaEtapa < cadencia.total_etapas) {
      const dataHora = new Date(agendamento.data_hora)
      if (proximaEtapa === 1) {
        const d = new Date(dataHora); d.setHours(d.getHours() - 24)
        proximaExecucao = d.toISOString()
      } else if (proximaEtapa === 2) {
        const d = new Date(dataHora); d.setHours(d.getHours() - 2)
        proximaExecucao = d.toISOString()
      }
    }

    if (proximaEtapa >= cadencia.total_etapas) {
      await supabase
        .from('cadencias')
        .update({ etapa_atual: proximaEtapa, status: 'concluida', proxima_execucao: null, atualizado_em: new Date().toISOString() })
        .eq('id', cadencia.id)
    } else {
      await supabase
        .from('cadencias')
        .update({ etapa_atual: proximaEtapa, proxima_execucao: proximaExecucao, atualizado_em: new Date().toISOString() })
        .eq('id', cadencia.id)
    }

    return NextResponse.json({ ok: true, etapa_enviada: etapaAtual.numero })
  } catch (err) {
    console.error('[POST /api/anti-noshow/enviar] erro', err)
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 })
  }
}
