import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createEvolutionClient } from '@/lib/evolution'

// ─────────────────────────────────────────────
// GET /api/cron/anti-noshow
// Protegido por Authorization: Bearer {CRON_SECRET}
// Executa todo dia às 08h (configurado no vercel.json)
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Validar secret do cron
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const agora = new Date()
  const resultados: Array<{ cadencia_id: string; etapa: number; status: string }> = []
  let totalEnviados = 0
  let totalErros = 0

  try {
    // 1. Buscar cadências ativas anti_noshow com próxima execução passada
    const { data: cadencias, error: errCad } = await supabase
      .from('cadencias')
      .select(`
        id,
        clinica_id,
        contato_id,
        agendamento_id,
        etapa_atual,
        total_etapas,
        proxima_execucao,
        cadencia_etapas (
          id, numero, mensagem_template, status
        ),
        agendamentos (
          id, servico, data_hora, status
        ),
        contatos (
          id, nome, telefone
        )
      `)
      .eq('tipo', 'anti_noshow')
      .eq('status', 'ativa')
      .lte('proxima_execucao', agora.toISOString())

    if (errCad) {
      console.error('[cron/anti-noshow] erro ao buscar cadências', errCad)
      return NextResponse.json({ error: errCad.message }, { status: 500 })
    }

    if (!cadencias || cadencias.length === 0) {
      return NextResponse.json({ enviados: 0, mensagem: 'Nenhuma cadência pendente' })
    }

    for (const cadencia of cadencias) {
      try {
        // Verificar se agendamento ainda está ativo
        const agendamento = cadencia.agendamentos as unknown as { id: string; servico: string; data_hora: string; status: string } | null
        if (!agendamento || ['realizado', 'cancelado', 'no_show'].includes(agendamento.status)) {
          // Cancelar cadência pois agendamento não está mais ativo
          await supabase
            .from('cadencias')
            .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
            .eq('id', cadencia.id)
          resultados.push({ cadencia_id: cadencia.id, etapa: cadencia.etapa_atual, status: 'cancelada_agendamento_inativo' })
          continue
        }

        const contato = cadencia.contatos as unknown as { id: string; nome: string; telefone: string } | null
        if (!contato) {
          resultados.push({ cadencia_id: cadencia.id, etapa: cadencia.etapa_atual, status: 'erro_contato_nao_encontrado' })
          continue
        }

        // Encontrar a etapa atual
        const etapas = cadencia.cadencia_etapas as unknown as Array<{ id: string; numero: number; mensagem_template: string; status: string }>
        const etapaAtual = etapas?.find(e => e.numero === cadencia.etapa_atual + 1)

        if (!etapaAtual || etapaAtual.status === 'enviado') {
          // Concluir cadência se todas as etapas foram enviadas
          const proximaEtapa = cadencia.etapa_atual + 1
          if (proximaEtapa >= cadencia.total_etapas) {
            await supabase
              .from('cadencias')
              .update({ status: 'concluida', atualizado_em: new Date().toISOString() })
              .eq('id', cadencia.id)
          }
          continue
        }

        // Enviar mensagem via Evolution API
        let evolution
        try {
          evolution = await createEvolutionClient(cadencia.clinica_id)
        } catch {
          resultados.push({ cadencia_id: cadencia.id, etapa: cadencia.etapa_atual, status: 'erro_evolution_nao_configurado' })
          totalErros++
          continue
        }

        await evolution.sendText(contato.telefone, etapaAtual.mensagem_template)

        // Marcar etapa como enviada
        await supabase
          .from('cadencia_etapas')
          .update({ status: 'enviado', enviado_em: new Date().toISOString() })
          .eq('id', etapaAtual.id)

        // Calcular próxima execução
        const dataHoraAgendamento = new Date(agendamento.data_hora)
        const proximaEtapa = cadencia.etapa_atual + 1
        let proximaExecucao: Date | null = null

        if (proximaEtapa === 1) {
          // Etapa 2: 24h antes
          proximaExecucao = new Date(dataHoraAgendamento)
          proximaExecucao.setHours(proximaExecucao.getHours() - 24)
        } else if (proximaEtapa === 2) {
          // Etapa 3: 2h antes
          proximaExecucao = new Date(dataHoraAgendamento)
          proximaExecucao.setHours(proximaExecucao.getHours() - 2)
        }

        // Atualizar cadência
        if (proximaEtapa < cadencia.total_etapas && proximaExecucao) {
          await supabase
            .from('cadencias')
            .update({
              etapa_atual: proximaEtapa,
              proxima_execucao: proximaExecucao.toISOString(),
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', cadencia.id)
        } else {
          // Última etapa enviada — concluir cadência
          await supabase
            .from('cadencias')
            .update({
              etapa_atual: proximaEtapa,
              status: 'concluida',
              proxima_execucao: null,
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', cadencia.id)
        }

        resultados.push({ cadencia_id: cadencia.id, etapa: cadencia.etapa_atual + 1, status: 'enviado' })
        totalEnviados++
      } catch (errItem) {
        console.error('[cron/anti-noshow] erro ao processar cadência', cadencia.id, errItem)
        resultados.push({ cadencia_id: cadencia.id, etapa: cadencia.etapa_atual, status: 'erro' })
        totalErros++
      }
    }

    return NextResponse.json({
      ok: true,
      total_processadas: cadencias.length,
      enviados: totalEnviados,
      erros: totalErros,
      resultados,
    })
  } catch (err) {
    console.error('[cron/anti-noshow] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
